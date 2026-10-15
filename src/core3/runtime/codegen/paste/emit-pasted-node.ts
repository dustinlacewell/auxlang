/**
 * A node with its tick pasted inline, per lane: gather each input into a
 * local (in port order, so lambdas run in the interpreter's order), bind the
 * tick's plain parameters, run the printed body inside a labelled block (a
 * `return` breaks out of it), then scatter the output locals into the slot
 * locals. State, config and outputs live in locals for the whole block
 * (node-frame.ts).
 */

import type { FunctionNode } from "../../../module/tick-subset/parse-function";
import type { ParamRoles } from "../../../module/tick-subset/subset-context";
import type { LaneBindings } from "../../bindings";
import type { ReduceGathers } from "../../gathers";
import type { NodeRun } from "../../node-run";
import type { DriverScope } from "../driver-scope";
import { emitScatter } from "../emit-scatter";
import { numLiteral } from "../js-literal";
import { laneSource } from "../lane-source";
import type { NameTable } from "../name-table";
import type { NodeCode } from "../node-code";
import { reducePort } from "../reduce-port";
import type { SlotAccess } from "../slot-access";
import type { FunctionNames } from "./function-names";
import { LaneFrame, NodeFrame } from "./node-frame";
import type { PasteContext } from "./paste-context";
import { printBody } from "./print-body";

/** What a node pastes: its parsed tick, the tick's names, and its pasted helpers. */
export interface PasteTick {
	readonly fn: FunctionNode;
	readonly declared: FunctionNames;
	readonly helpers: ReadonlyMap<string, string>;
}

export interface PasteEnv {
	readonly names: NameTable;
	readonly scope: DriverScope;
	/** Scope name of `hashRandom`. */
	readonly hashRandom: string;
}

/** One lane's inputs: gather lines (run each sample) and port → local. */
interface LaneInputs {
	readonly lines: readonly string[];
	readonly locals: ReadonlyMap<string, string>;
}

export function emitPastedNode(
	run: NodeRun,
	i: number,
	tick: PasteTick,
	env: PasteEnv,
	slots: SlotAccess,
): NodeCode {
	const node = new NodeFrame(run, env.names, env.scope);
	const lanes: LaneFrame[] = [];
	const sample: string[] = [];
	for (let lane = 0; lane < run.laneCount; lane++) {
		const inputs =
			run.gathers === null
				? mapInputs(run, lane, env, slots)
				: reduceInputs(run.gathers, env, slots);
		const frame = new LaneFrame(
			node,
			run.states[lane] as Record<string, unknown>,
			inputs.locals,
			env.names,
		);
		lanes.push(frame);
		sample.push(
			`// node ${i} lane ${lane} (pasted)`,
			"{",
			...inputs.lines,
			...pasteLane(run, tick, frame, env),
			...emitScatter(run, lane, (j) => node.output(run.outPorts[j] as string)),
			"}",
		);
	}
	return {
		before: [...node.before(), ...lanes.flatMap((l) => l.before())],
		sample,
		after: [...node.after(), ...lanes.flatMap((l) => l.after())],
	};
}

function mapInputs(run: NodeRun, lane: number, env: PasteEnv, slots: SlotAccess): LaneInputs {
	const b = (run.bindings as readonly LaneBindings[])[lane] as LaneBindings;
	const locals = new Map<string, string>();
	const lines = b.names.map((port, j) => {
		const local = env.names.fresh();
		locals.set(port, local);
		return `const ${local} = ${laneSource(b, j, env.names.fresh(), env.scope, slots)};`;
	});
	return { lines, locals };
}

function reduceInputs(g: ReduceGathers, env: PasteEnv, slots: SlotAccess): LaneInputs {
	const locals = new Map<string, string>();
	const lines = g.ports.flatMap((p) => {
		const local = env.names.fresh();
		locals.set(p.name, local);
		const port = reducePort(p, env.names.fresh(), env.scope, slots);
		return [...port.fill, `const ${local} = ${port.value};`];
	});
	return { lines, locals };
}

/** The tick's plain parameters as locals, then its body in a labelled block. */
function pasteLane(run: NodeRun, tick: PasteTick, frame: LaneFrame, env: PasteEnv): string[] {
	const [state, ins, outs, config, ...plain] = tick.declared.params;
	const locals = new Map([...tick.declared.locals].map((n) => [n, env.names.fresh()]));
	const values = plainValues(run);
	const params = plain.map((name, j) => {
		const local = env.names.fresh();
		locals.set(name, local);
		return `let ${local} = ${values[j] ?? "(void 0)"};`;
	});
	const exit = env.names.fresh();
	const ctx: PasteContext = {
		names: env.names,
		locals,
		labels: new Map(),
		roles: rolesOf(state, ins, outs, config),
		fields: frame,
		helpers: tick.helpers,
		hashRandom: env.hashRandom,
		exit,
	};
	return [...params, `${exit}: {`, ...printBody(tick.fn, ctx), "}"];
}

function rolesOf(
	state: string | undefined,
	ins: string | undefined,
	outs: string | undefined,
	config: string | undefined,
): ParamRoles {
	return {
		...(state !== undefined ? { state } : {}),
		...(ins !== undefined ? { ins } : {}),
		...(outs !== undefined ? { outs } : {}),
		...(config !== undefined ? { config } : {}),
	};
}

/** The values a tick receives after its four objects: `sr`, and a reducer's `width`. */
function plainValues(run: NodeRun): string[] {
	return run.gathers === null ? ["sr"] : ["sr", numLiteral(run.gathers.width)];
}
