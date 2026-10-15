/**
 * One node's work for one sample inside the render function, as the
 * interpreter's walk (runtime/interpret-sample.ts): a map node's lanes each
 * call their lambdas, tick and scatter their outputs; a reducer first
 * gathers its input lanes into f64 views, then ticks once.
 */

import { type FunctionNode, parseFunction } from "../../module/tick-subset/parse-function";
import { GATHER_CUR } from "../../runtime/gathers";
import type { NodeRun } from "../../runtime/node-run";
import type { ModuleSource } from "../../types";
import { tableIntrinsics } from "../bridge/table-intrinsics";
import type { FnEmitter } from "../compile/fn-emitter";
import type { FunctionTable } from "../compile/function-table";
import type { Functions } from "../compile/functions";
import { type HelperSet, helperSet } from "../compile/helper-set";
import type { RenderInput } from "./emit-render";
import { emitTick } from "./emit-tick";
import { emitLambdaInputs } from "./lambda-inputs";
import { laneRoles } from "./lane-roles";
import type { RenderLocals } from "./render-locals";
import type { ValueSlots } from "./value-slots";

/** What the walk emits into and with: the render function and its locals. */
export interface WalkSite {
	readonly e: FnEmitter;
	readonly input: RenderInput;
	readonly fns: Functions;
	readonly table: FunctionTable;
	readonly locals: RenderLocals;
	readonly slots: ValueSlots;
	/** The f64 local holding this sample's lambda time. */
	readonly time: number;
}

export class NodeWalk {
	private readonly ticks = new Map<string, FunctionNode>();
	private readonly sets = new Map<string, HelperSet>();

	constructor(private readonly site: WalkSite) {}

	node(i: number): void {
		const run = this.site.input.runs[i] as NodeRun;
		if (run.gathers !== null) {
			this.gather(i);
			this.lane(i, 0);
			this.scatter(i, 0);
			return;
		}
		for (let lane = 0; lane < run.laneCount; lane++) {
			this.lane(i, lane);
			this.scatter(i, lane);
		}
	}

	private lane(i: number, lane: number): void {
		const { e, input, locals, slots } = this.site;
		const run = input.runs[i] as NodeRun;
		const module = input.modules[i] as string;
		const memory = input.memory.nodes[i];
		const laneMemory = memory?.lanes[lane];
		if (memory === undefined || laneMemory === undefined)
			throw new Error(`wasm: no memory for node ${i}`);
		const lambdas = emitLambdaInputs(
			e,
			{
				sources: input.lambdas[i]?.[lane] ?? {},
				memory: laneMemory.lambdas,
				owner: `${module} node ${i} lane ${lane}`,
				time: this.site.time,
				sampleRate: input.sampleRate,
			},
			this.site.fns,
			this.site.table,
		);
		emitTick(e, {
			fn: this.tick(i),
			owner: `${module} tick (node ${i} lane ${lane})`,
			calls: this.site.fns.calls(this.set(i)),
			roles: laneRoles(e, run, memory, lane, slots, (addr) => locals.at(addr), lambdas),
			cache: {
				k: "locals",
				slot: (s) => locals.at(laneMemory.cache + 8 * s),
				address: laneMemory.cache,
			},
			intrinsics:
				laneMemory.table === null ? null : tableIntrinsics(laneMemory.table, i, lane, input.fill),
			sampleRate: input.sampleRate,
			width: run.gathers?.width ?? 1,
		});
	}

	/** The engine's scatter: each output into its value slot for this lane. */
	private scatter(i: number, lane: number): void {
		const { e, input, locals, slots } = this.site;
		const run = input.runs[i] as NodeRun;
		const outs = input.memory.nodes[i]?.outs ?? {};
		run.outPorts.forEach((port, j) => {
			const from = locals.at(outs[port] as number);
			e.code.get(from).set(slots.current((run.outBases[j] as number) + lane));
		});
	}

	/** A reducer's lane inputs into their f64 views, as the engine's gathers. */
	private gather(i: number): void {
		const { e, input, slots } = this.site;
		const run = input.runs[i] as NodeRun;
		const views = input.memory.nodes[i]?.views ?? {};
		for (const port of run.gathers?.ports ?? []) {
			const view = views[port.name];
			if (view === undefined) continue;
			for (let l = 0; l < port.srcLanes; l++) {
				const slot = port.base + l;
				const from = port.kind === GATHER_CUR ? slots.current(slot) : slots.previous(slot);
				e.code
					.i32Const(0)
					.get(from)
					.storeF64(view + 8 * l);
			}
		}
	}

	private tick(i: number): FunctionNode {
		const { input } = this.site;
		const text = (input.sources[i] as ModuleSource).tick;
		let fn = this.ticks.get(text);
		if (fn === undefined) {
			fn = parseFunction(text, `${input.modules[i]} tick`).node;
			this.ticks.set(text, fn);
		}
		return fn;
	}

	private set(i: number): HelperSet {
		const { input } = this.site;
		const module = input.modules[i] as string;
		let set = this.sets.get(module);
		if (set === undefined) {
			set = helperSet(module, (input.sources[i] as ModuleSource).helpers);
			this.sets.set(module, set);
		}
		return set;
	}
}
