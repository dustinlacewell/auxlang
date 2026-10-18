/**
 * Top-level compile entry: an `EvalResult` (roots + ambient clock + seed) in,
 * a serializable `Program` out. The pipeline, in order:
 *
 *   subpatches   each sub-patch instance → its inner graph, spliced in as plain
 *                nodes (compile/subpatch); the program never sees a sub-patch
 *   slots        control ports and chosen literals → live slots (bind-slots)
 *   mods         `.mod` terms → base + Σ(signal × depth) as add/mul nodes
 *   collect      reachable nodes from the roots (object-identity graph walk)
 *   expand       pattern inputs → `seq(pattern).out` nodes (patterns as knobs)
 *   seqs         seq pattern config → voiced Pat data, lane count, seed
 *   clocks       unconnected phase-unit inputs → the ambient clock's position
 *   clocked      seqs read straight from a clock are marked clocked
 *   meter        beat-counting clock readers copy their clock's beatsPerBar
 *   z1           connections into z1 nodes become z-edges (the unit delay)
 *   widths       max-input-width fixpoint (reduce collapses to 1)
 *   toposort     z-edges cut; a z-less cycle is a loud error
 *   index        topo position → node index
 *   identities   kind and place per node, for re-eval matching (pin added at emit)
 *   emit         per-lane PortSrc resolution → PNode → Program
 *   specs        eval-defined (defmod) specs used by reachable nodes
 *                serialize into program.specs (tick/state as source strings);
 *                each pays the closure-free fence at this crossing — a
 *                closure-capturing tick fails HERE, loudly, never in the
 *                audio thread. Unused definitions never cross, so they
 *                never pay it.
 *
 * Nothing here imports the module library: modules are reached only through the
 * registry, so tests register their own toy modules.
 */

import { nodePorts } from "@/engine/dsp/node-ports";
import { isLambdaInput, isNodeRef, isSlotInput, isZRef } from "../graph/input-kinds";
import type { GNode, InputValue } from "../graph/node";
import { bindLambdaMath } from "../dsp/bind-math/bind-lambda-math";
import { type SpecTable, resolveSpec } from "../dsp/resolve";
import { assertClosureFree, serializeSpec } from "../dsp/serialize";
import type { EvalResult } from "../patch/context";
import type { ModuleSpec, PNode, PortAnn, PortSrc, Program, SerializedModuleSpec } from "../types";
import { resolveAmbientClocks } from "./ambient-clock";
import { atNode } from "./at-node";
import { bindSlots } from "./bind-slots";
import { collect } from "./collect";
import { copyMeter } from "./copy-meter";
import { expandMods } from "./expand-mods";
import { expandPatterns } from "./expand-patterns";
import { type Placement, identities } from "./identities";
import { markClocked } from "./mark-clocked";
import { prepareSeqs } from "./prepare-seqs";
import { expandSubpatches } from "./subpatch/expand-subpatches";
import { toposort } from "./toposort";
import { SlotTable } from "./slot-table";
import { resolveWidths } from "./widths";
import { cutZ1Edges } from "./z1-edges";

/** Everything emit needs, resolved once at compile entry. */
interface Resolved {
	readonly widths: Map<GNode, number>;
	readonly index: Map<GNode, number>;
	readonly identities: Map<GNode, Placement>;
	/** Patch-defined specs (defmod) from the eval, layered under every module lookup. */
	readonly specs: SpecTable;
	/** The live slots emit reads, indexed as it meets them. */
	readonly slots: SlotTable;
}

export function compile(evalResult: EvalResult): Program {
	const specs = evalResult.specs;
	const allRoots = [...evalResult.roots, ...evalResult.kept];
	expandSubpatches(evalResult);
	bindSlots(collect(allRoots), specs, evalResult.slotSites);
	expandMods(collect(allRoots), specs);
	const reachable = collect(allRoots); // re-walk: the mod arithmetic nodes are new
	expandPatterns(reachable, evalResult.clock);
	const lifted = collect(allRoots); // re-walk: the knob seq nodes are new
	prepareSeqs(lifted, evalResult.seed);
	resolveAmbientClocks(lifted, evalResult.clock, specs);
	markClocked(lifted);
	copyMeter(lifted, specs);
	const nodes = collect(allRoots); // re-walk: the ambient clock may be new
	cutZ1Edges(nodes);

	const order = toposort(nodes);
	const resolved: Resolved = {
		widths: resolveWidths(nodes, specs),
		index: indexByPosition(order),
		identities: identities(allRoots, order, specs),
		specs,
		slots: new SlotTable(),
	};

	const pnodes = order.map((node) => atNode(node, () => emitNode(node, resolved)));
	const outs = outIndices(evalResult.roots, resolved.index);
	const used = usedSpecs(order, specs);
	const liveSlots = resolved.slots.list;
	return {
		nodes: pnodes,
		outs,
		seed: evalResult.seed,
		...(used.length > 0 ? { specs: used } : {}),
		...(liveSlots.length > 0 ? { liveSlots } : {}),
	};
}

/** Only specs actually reached by the program ship; unused definitions are pruned with their chains. */
function usedSpecs(order: readonly GNode[], specs: SpecTable): SerializedModuleSpec[] {
	const modules = new Set(order.map((node) => node.module));
	return [...specs.values()].filter((s) => modules.has(s.name)).map(serializeAndFence);
}

/** The string crossing, fenced: serialize, then trial the exact hydrate→tick round trip. */
function serializeAndFence(spec: ModuleSpec): SerializedModuleSpec {
	const serialized = serializeSpec(spec);
	assertClosureFree(serialized);
	return serialized;
}

function indexByPosition(order: readonly GNode[]): Map<GNode, number> {
	const index = new Map<GNode, number>();
	order.forEach((node, i) => index.set(node, i));
	return index;
}

function outIndices(roots: readonly GNode[], index: Map<GNode, number>): number[] {
	const seen = new Set<number>();
	const outs: number[] = [];
	for (const root of roots) {
		const i = index.get(root);
		if (i === undefined || seen.has(i)) continue;
		seen.add(i);
		outs.push(i);
	}
	return outs;
}

function emitNode(node: GNode, r: Resolved): PNode {
	const spec = resolveSpec(node.module, r.specs);
	const width = r.widths.get(node) ?? 1;
	const ins = nodePorts(spec, node.groups).ins;
	const lanes = Array.from({ length: width }, (_, lane) => resolveLane(node, ins, lane, r));
	return {
		...(r.identities.get(node) as Placement),
		module: node.module,
		width,
		lanes,
		config: strippedConfig(node.config),
		...(node.groups !== undefined ? { groups: node.groups } : {}),
		...(node.pin !== undefined ? { pin: node.pin } : {}),
		...(node.seed !== undefined ? { seed: node.seed } : {}),
		...(node.site !== undefined ? { site: node.site } : {}),
		...(node.bindingSites !== undefined ? { bindingSites: node.bindingSites } : {}),
	};
}

/** One lane's PortSrc for every declared input port; unconnected uses the annotation default. */
function resolveLane(
	node: GNode,
	ins: Record<string, PortAnn>,
	lane: number,
	r: Resolved,
): Record<string, PortSrc> {
	const record: Record<string, PortSrc> = {};
	for (const [port, ann] of Object.entries(ins)) {
		const src = portSrc(node, port, ann, lane, r);
		if (src !== undefined) record[port] = src;
	}
	return record;
}

function portSrc(
	node: GNode,
	port: string,
	ann: PortAnn,
	lane: number,
	r: Resolved,
): PortSrc | undefined {
	const value = node.inputs[port];
	if (value === undefined) return defaultSrc(node, port, ann);
	return srcOf(value, node, port, lane, r);
}

function srcOf(value: InputValue, node: GNode, port: string, lane: number, r: Resolved): PortSrc {
	if (typeof value === "number") return { k: "c", v: value };
	if (isSlotInput(value)) return { k: "s", slot: r.slots.index(value.slot) };
	if (isLambdaInput(value)) return { k: "l", lambda: bindLambdaMath(value.lambda.toString()) };
	if (isNodeRef(value))
		return connSrc("n", value.node, value.port, value.lane, lane, r, node, port);
	if (isZRef(value)) {
		const src = connSrc("z", value.z.node, value.z.port, undefined, lane, r, node, port);
		return value.z.start === undefined ? src : { ...src, start: value.z.start };
	}
	throw new Error(
		`${node.module}.${port}: unexpanded pattern input reached compile (internal error)`,
	);
}

/** A connection, with lane broadcast: an explicit lane pins it, otherwise `lane % srcWidth`. */
function connSrc<K extends "n" | "z">(
	k: K,
	src: GNode,
	srcPort: string,
	pinnedLane: number | undefined,
	lane: number,
	r: Resolved,
	consumer: GNode,
	consumerPort: string,
): { readonly k: K; readonly node: number; readonly port: string; readonly lane: number } {
	const target = r.index.get(src);
	if (target === undefined) {
		throw new Error(
			`${consumer.module}.${consumerPort}: source '${src.module}' is not in the program (internal error)`,
		);
	}
	const srcWidth = r.widths.get(src) ?? 1;
	const srcLane = pinnedLane ?? (srcWidth <= 1 ? 0 : lane % srcWidth);
	return { k, node: target, port: srcPort, lane: srcLane };
}

/**
 * A required (`def: null`) unconnected input is a loud error. An OPTIONAL
 * null-default (`opt`) is legal: the port is omitted from the lane record and
 * the engine binds the absent sentinel. Otherwise: the default constant.
 */
function defaultSrc(node: GNode, port: string, ann: PortAnn): PortSrc | undefined {
	if (ann.def === null) {
		if (ann.opt) return undefined;
		throw new Error(
			`${node.module}.${port} is required but unconnected. Connect a signal to '${port}'.`,
		);
	}
	return { k: "c", v: ann.def };
}

/** Config minus compile hints (`__`-prefixed keys never ship in the Program). */
function strippedConfig(config: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(config)) {
		if (!k.startsWith("__")) out[k] = v;
	}
	return out;
}
