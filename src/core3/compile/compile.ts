/**
 * Top-level compile entry: an `EvalResult` (roots + ambient clock + seed) in,
 * a serializable `Program` out. The pipeline, in order:
 *
 *   collect      reachable nodes from the roots (object-identity graph walk)
 *   expand       pattern inputs → patsig nodes (clocked by the ambient clock)
 *   clocks       unconnected phase-unit `clk` inputs → the ambient clock
 *   z1           connections into z1 nodes become z-edges (the unit delay)
 *   widths       max-input-width fixpoint (reduce collapses to 1)
 *   toposort     z-edges cut; a z-less cycle is a loud error
 *   index        topo position → node index
 *   ids          structural id per node (pin overrides at emit)
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

import { isLambdaInput, isNodeRef, isZRef } from "../graph/input-kinds";
import type { GNode, InputValue } from "../graph/node";
import { type SpecTable, resolveSpec } from "../module/resolve";
import { assertClosureFree, serializeSpec } from "../module/serialize";
import type { EvalResult } from "../patch/context";
import type { ModuleSpec, PNode, PortAnn, PortSrc, Program, SerializedModuleSpec } from "../types";
import { resolveAmbientClocks } from "./ambient-clock";
import { collect } from "./collect";
import { expandPatterns } from "./expand-patterns";
import { structuralIds } from "./structural-id";
import { toposort } from "./toposort";
import { resolveWidths } from "./widths";
import { cutZ1Edges } from "./z1-edges";

/** Everything emit needs, resolved once at compile entry. */
interface Resolved {
	readonly widths: Map<GNode, number>;
	readonly index: Map<GNode, number>;
	readonly ids: Map<GNode, string>;
	/** Patch-defined specs (defmod) from the eval, layered under every module lookup. */
	readonly specs: SpecTable;
}

export function compile(evalResult: EvalResult): Program {
	const specs = evalResult.specs;
	const reachable = collect(evalResult.roots);
	expandPatterns(reachable, evalResult.clock, evalResult.seed);
	resolveAmbientClocks(reachable, evalResult.clock, specs);
	const nodes = collect(evalResult.roots); // re-walk: patsig + ambient clock nodes are new
	cutZ1Edges(nodes);

	const order = toposort(nodes);
	const resolved: Resolved = {
		widths: resolveWidths(nodes, specs),
		index: indexByPosition(order),
		ids: structuralIds(order, specs),
		specs,
	};

	const pnodes = order.map((node) => emitNode(node, resolved));
	const outs = outIndices(evalResult.roots, resolved.index);
	const used = usedSpecs(order, specs);
	return {
		nodes: pnodes,
		outs,
		seed: evalResult.seed,
		...(used.length > 0 ? { specs: used } : {}),
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
	const lanes = Array.from({ length: width }, (_, lane) => resolveLane(node, spec.ins, lane, r));
	return {
		id: r.ids.get(node) ?? "n00000000",
		module: node.module,
		width,
		lanes,
		config: strippedConfig(node.config),
		...(node.pin !== undefined ? { pin: node.pin } : {}),
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
	if (isLambdaInput(value)) return { k: "l", src: value.lambda.toString() };
	if (isNodeRef(value))
		return connSrc("n", value.node, value.port, value.lane, lane, r, node, port);
	if (isZRef(value))
		return connSrc("z", value.z.node, value.z.port, undefined, lane, r, node, port);
	throw new Error(
		`${node.module}.${port}: unexpanded pattern input reached compile (internal error)`,
	);
}

/** A connection, with lane broadcast: an explicit lane pins it, otherwise `lane % srcWidth`. */
function connSrc(
	k: "n" | "z",
	src: GNode,
	srcPort: string,
	pinnedLane: number | undefined,
	lane: number,
	r: Resolved,
	consumer: GNode,
	consumerPort: string,
): PortSrc {
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
