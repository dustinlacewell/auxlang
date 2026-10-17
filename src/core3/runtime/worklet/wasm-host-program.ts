/**
 * A program on the worklet host (live-host.ts), from its prepared form to
 * the WASM engine that plays it: built a budget at a time while the old
 * program plays, swapped in at a block boundary, then rendered. Its build
 * runs in two stages:
 *
 * 1. the start values: the engine-build steps with no driver
 *    (build/engine-build.ts): lane states, their scratch, the value buffer;
 * 2. the engine (build/wasm-steps.ts): instantiate the posted Module, touch
 *    its memory, write the start values into it a lane at a time, make the
 *    engine over it, prefill each table lane for the cycle it starts in
 *    (wasm/host/prefill-cycles.ts; a lane whose table key is unchanged
 *    copies the source lane's tables and fill state instead of filling),
 *    and bind the carry's views (copying once).
 *
 * The swap runs the carry plan: copies only. Then the slot writes that came
 * while it built (pending-slots.ts) land. `source` is the program it
 * will continue at the swap (the host builds one program at a time, so it
 * is still the one playing then). It carries only from the program the plan
 * was made against (wasm-prepared.ts serials); from any other, or none, the
 * engine starts fresh.
 */

import type { Registry } from "../../types";
import type { TableCarry } from "../../wasm/host/carry/table-carry";
import { initLane, initValues } from "../../wasm/host/init-memory";
import { type LinkedInstance, linkInstance } from "../../wasm/host/link-instance";
import { prefillCycles } from "../../wasm/host/prefill-cycles";
import { touchPages } from "../../wasm/host/touch-pages";
import { WasmEngine } from "../../wasm/host/wasm-engine";
import { tableLanes } from "../../wasm/layout/table-lanes";
import { EngineBuild } from "../build/engine-build";
import { StepRunner } from "../build/step-runner";
import { type WasmStep, wasmSteps } from "../build/wasm-steps";
import type { EngineParts } from "../engine-parts";
import type { DisplaySource } from "../live/display-source";
import type { MonitorRegion } from "../live/monitor-region";
import type { HostPrepared } from "../prepare/host-prepared";
import type { WasmCarry, WasmPrepared } from "../prepare/wasm-prepared";
import { PendingSlots } from "./pending-slots";

export class WasmHostProgram {
	private start: EngineBuild | null;
	private readonly steps: StepRunner<WasmStep>;
	private source: WasmHostProgram | null;
	private linked: LinkedInstance | null = null;
	private engine: WasmEngine | null = null;
	private cycles: Float64Array | null = null;
	private swapped = false;

	constructor(
		readonly prepared: HostPrepared,
		registry: Registry,
		source: WasmHostProgram | null,
		private readonly pending = new PendingSlots(prepared.program.liveSlots?.length ?? 0),
	) {
		const { wasm } = prepared;
		this.source = carriesFrom(wasm, source);
		this.start = new EngineBuild(prepared, registry, undefined);
		const lanes = tableLanes(wasm.layout).length;
		this.steps = new StepRunner(wasmSteps(wasm, lanes, this.source !== null), (step) =>
			this.execute(step),
		);
	}

	get wasm(): WasmPrepared {
		return this.prepared.wasm;
	}

	/** True when every build step has run: the next block swaps it in. */
	get built(): boolean {
		return this.steps.done;
	}

	/** Run build steps within `budget` (estimated microseconds). */
	advance(budget: number): void {
		if (this.start !== null && !this.start.done) this.start.advance(budget);
		else this.steps.advance(budget);
	}

	/**
	 * The swap block's work: copy along the plan, then let go of the source,
	 * so no program keeps its predecessors.
	 */
	swapIn(): void {
		const source = this.source;
		if (source !== null) {
			this.live.handOver(source.live.liveState());
			this.live.releaseCarry();
			this.source = null;
		}
		this.pending.flushInto(this.live);
		this.swapped = true;
	}

	/** Slot writes: into the engine once swapped in, else held for the swap (pending-slots.ts). */
	writeSlots(pairs: Float64Array): void {
		if (this.swapped) this.live.writeSlots(pairs);
		else this.pending.writeSlots(pairs);
	}

	/** The engine's monitor region; null when not monitored. Once swapped in. */
	get monitor(): MonitorRegion | null {
		return this.live.monitor;
	}

	/** The engine's display buffers (live/display-source.ts). Once swapped in. */
	get displays(): DisplaySource {
		return this.live.displays;
	}

	/** Advance `n` samples; write l/r into `outL`/`outR` from `offset`. Once swapped in. */
	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void {
		this.live.renderBlock(outL, outR, offset, n);
	}

	private get live(): WasmEngine {
		return this.engine as WasmEngine;
	}

	private execute(step: WasmStep): void {
		if (step.k === "instantiate") this.linked = linkInstance(this.wasm.module);
		else if (step.k === "touch") touchPages(this.memory, step.page, step.count);
		else if (step.k === "values") this.writeValues();
		else if (step.k === "lane") this.writeLane(step.node, step.lane);
		else if (step.k === "engine") this.makeEngine();
		else if (step.k === "prefill") this.prefill(step.lane);
		else this.bind();
	}

	/** The instance's memory, until the engine is made over it. */
	private get memory(): WebAssembly.Memory {
		return (this.linked as LinkedInstance).instance.exports.memory as WebAssembly.Memory;
	}

	private get parts(): EngineParts {
		return (this.start as EngineBuild).parts();
	}

	private writeValues(): void {
		const { runs, bufs } = this.parts;
		initValues(new Float64Array(this.memory.buffer), this.wasm.layout, runs, bufs.cur, bufs.slots);
	}

	private writeLane(node: number, lane: number): void {
		const f64 = new Float64Array(this.memory.buffer);
		initLane(f64, this.wasm.layout, this.parts.runs, node, lane);
	}

	private makeEngine(): void {
		const { runs, bufs } = this.parts;
		const { layout, facts, carry } = this.wasm;
		const input = {
			compiled: { layout },
			start: { runs, cur: bufs.cur, slots: bufs.slots },
			facts,
			carry: carry?.plan ?? null,
		};
		this.engine = new WasmEngine(this.linked as LinkedInstance, input, { written: true });
		this.linked = null;
		this.start = null;
	}

	/** Bind the carry's views and copy once: the copy maps what the swap's copy reads and writes. */
	private bind(): void {
		this.live.handOver((this.source as WasmHostProgram).live.liveState());
	}

	/**
	 * Lane `k`: from the source's tables when they are its own too
	 * (carry/table-carry.ts), else filled. The first lane's step picks every
	 * lane's cycle, from the source as it plays now.
	 */
	private prefill(k: number): void {
		const cycle = (this.cycles ?? this.pickCycles())[k] as number;
		const tables = this.tableCarry;
		const shared = tables?.shared[k] ?? -1;
		const source = this.source?.live;
		if (source !== undefined && shared >= 0)
			this.live.prefillLaneFrom(k, cycle, source, shared, sourceLane(tables as TableCarry, k));
		else if (Number.isFinite(cycle)) this.live.prefillLane(k, cycle);
	}

	/** The table carry from the source; null with no source to carry from. */
	private get tableCarry(): TableCarry | null {
		return this.source === null ? null : (this.wasm.carry as WasmCarry).tables;
	}

	private pickCycles(): Float64Array {
		const source = this.source?.live ?? null;
		const sources = this.tableCarry?.sources ?? null;
		this.cycles = prefillCycles(this.live.tableLanes, sources, (node, lane) =>
			(source as WasmEngine).tableCycle(node, lane),
		);
		return this.cycles;
	}
}

/** The old lane table lane `k` takes over; -1 for none. */
function sourceLane({ sources }: TableCarry, k: number): number {
	return (sources[2 * k] as number) < 0 ? -1 : (sources[2 * k + 1] as number);
}

/** The running program to carry from: the one the plan was made against, still playing. */
function carriesFrom(wasm: WasmPrepared, source: WasmHostProgram | null): WasmHostProgram | null {
	if (wasm.carry === null || source === null) return null;
	return source.wasm.serial === wasm.carry.from ? source : null;
}
