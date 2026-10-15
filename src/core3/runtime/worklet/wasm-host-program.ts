/**
 * A program on the WASM engine (host-program.ts). Its build runs in two
 * stages, a budget per block:
 *
 * 1. the start values: the engine-build steps with no driver
 *    (build/engine-build.ts): lane states, their scratch, the value buffer;
 * 2. the engine (build/wasm-steps.ts): instantiate the posted Module, touch
 *    its memory, write the start values into it a lane at a time, make the
 *    engine over it, prefill each table lane for the cycle it starts in
 *    (wasm/host/prefill-cycles.ts), and bind the carry's views (copying
 *    once).
 *
 * The swap runs the carry plan: copies only. It carries from the running
 * WASM program the plan was made against (wasm-prepared.ts serials); from
 * any other, or none, the engine starts fresh.
 */

import type { Registry } from "../../types";
import { tableSources } from "../../wasm/host/carry/table-sources";
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
import type { PreparedProgram } from "../prepare/prepare-program";
import type { WasmPrepared } from "../prepare/wasm-prepared";
import type { HostProgram } from "./host-program";

export class WasmHostProgram implements HostProgram {
	private start: EngineBuild | null;
	private readonly steps: StepRunner<WasmStep>;
	private source: WasmHostProgram | null;
	private linked: LinkedInstance | null = null;
	private engine: WasmEngine | null = null;
	private cycles: Float64Array | null = null;

	constructor(
		readonly prepared: PreparedProgram,
		readonly wasm: WasmPrepared,
		registry: Registry,
		source: HostProgram | null,
	) {
		this.source = carriesFrom(wasm, source);
		this.start = new EngineBuild(prepared, registry, undefined);
		const lanes = tableLanes(wasm.layout).length;
		this.steps = new StepRunner(wasmSteps(wasm, lanes, this.source !== null), (step) =>
			this.execute(step),
		);
	}

	get built(): boolean {
		return this.steps.done;
	}

	advance(budget: number): void {
		if (this.start !== null && !this.start.done) this.start.advance(budget);
		else this.steps.advance(budget);
	}

	/** Copy along the plan, then let go of the source, so no program keeps its predecessors. */
	swapIn(): void {
		const source = this.source;
		if (source === null) return;
		this.live.handOver(source.live.liveState());
		this.live.releaseCarry();
		this.source = null;
	}

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
		initValues(new Float64Array(this.memory.buffer), this.wasm.layout, runs, bufs.cur);
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
			start: { runs, cur: bufs.cur },
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

	/** Lane `k`; the first lane's step picks every lane's cycle, from the source as it plays now. */
	private prefill(k: number): void {
		const cycles = this.cycles ?? this.pickCycles();
		const cycle = cycles[k] as number;
		if (Number.isFinite(cycle)) this.live.prefillLane(k, cycle);
	}

	private pickCycles(): Float64Array {
		const source = this.source?.live ?? null;
		const sources =
			source === null
				? null
				: tableSources(source.side, { layout: this.wasm.layout, facts: this.wasm.facts });
		this.cycles = prefillCycles(this.live.tableLanes, sources, (node, lane) =>
			(source as WasmEngine).tableCycle(node, lane),
		);
		return this.cycles;
	}
}

/** The running program to carry from: the one the plan was made against, still playing. */
function carriesFrom(wasm: WasmPrepared, source: HostProgram | null): WasmHostProgram | null {
	if (wasm.carry === null || !(source instanceof WasmHostProgram)) return null;
	return source.wasm.serial === wasm.carry.from ? source : null;
}
