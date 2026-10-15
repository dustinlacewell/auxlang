/**
 * A compiled program running in an instance, with the JS engine's contract
 * (runtime/live-engine.ts): `renderBlock`, `tick`, `sampleCount`,
 * `collectState`, `liveState` and `handOver`, so a host can run either. The
 * instance is made from a `WebAssembly.Module`, which is what a worklet would
 * receive from the host thread (it is structured-cloneable).
 *
 * The hand-over differs in one place: the JS engine plans its carry while it
 * builds, the WASM engine gets it prepared (carry-plan.ts). `liveState` is
 * the instance's memory; `bindCarry` builds the copy views on it ahead, and
 * `handOver` copies along the plan from the old instance's memory into this
 * one, allocating nothing. A snapshot (an `EngineState`) goes in through
 * `load` instead (state-codec.ts).
 */

import type { NodeRun } from "../../runtime/node-run";
import { slotOf } from "../../runtime/output-slots";
import type { Engine, EngineState } from "../../types";
import type { CarrySide } from "./carry-plan";
import { type CarryViews, bindCarry, runCarry } from "./carry/run-carry";
import { initMemory } from "./init-memory";
import type { PreparedWasm } from "./prepare-wasm";
import { SeqTables } from "./seq-tables";
import { type CodecTarget, readEngineState, writeEngineState } from "./state-codec";
import { type WasmMemory, memoryViews } from "./wasm-memory";

/** The engine values an instance starts from. */
export interface WasmStart {
	readonly runs: readonly NodeRun[];
	readonly cur: Float64Array;
}

export class WasmEngine implements Engine {
	private readonly views: WasmMemory;
	private readonly f32: Float32Array;
	private readonly render: (n: number) => void;
	private readonly tables: SeqTables;
	private readonly codec: CodecTarget;
	private carryViews: CarryViews | null = null;

	constructor(
		module: WebAssembly.Module,
		private readonly prepared: PreparedWasm,
	) {
		const { layout } = prepared.compiled;
		const tables = new SeqTables(prepared.start.runs, layout, () => this.views.f64);
		this.tables = tables;
		const instance = new WebAssembly.Instance(module, {
			env: { fill: (node: number, lane: number, cycle: number) => tables.fill(node, lane, cycle) },
		});
		const memory = (instance.exports.memory as WebAssembly.Memory).buffer;
		this.views = memoryViews(memory);
		this.f32 = new Float32Array(memory);
		this.render = instance.exports.render as (n: number) => void;
		this.codec = { memory, layout, facts: prepared.facts };
		initMemory(this.views.f64, layout, prepared.start.runs, prepared.start.cur);
	}

	/** This engine as the next program's carry plan sees it. */
	get side(): CarrySide {
		return { layout: this.prepared.compiled.layout, facts: this.prepared.facts };
	}

	get sampleCount(): number {
		return this.views.f64[this.prepared.compiled.layout.count / 8] as number;
	}

	/** Advance `n` (at most BLOCK_MAX) samples; write l/r into `outL`/`outR` from `offset`. */
	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void {
		this.render(n);
		const { outL: l, outR: r } = this.prepared.compiled.layout;
		outL.set(this.f32.subarray(l / 4, l / 4 + n), offset);
		outR.set(this.f32.subarray(r / 4, r / 4 + n), offset);
	}

	tick(out: Float32Array): void {
		this.render(1);
		const { outL, outR } = this.prepared.compiled.layout;
		out[0] = this.f32[outL / 4] as number;
		out[1] = this.f32[outR / 4] as number;
	}

	/** Lane states, feedback values and time, decoded: a snapshot that shares nothing with memory. */
	collectState(): EngineState {
		return readEngineState(this.codec);
	}

	/** The instance's memory, for a hand-over on this block only. */
	liveState(): WasmMemory {
		return this.views;
	}

	/**
	 * Build the hand-over's views on the running engine's memory `source`
	 * (a build step, as the JS build plans its carry against the running
	 * state): the swap then only copies.
	 */
	bindCarry(source: WasmMemory): void {
		const { carry } = this.prepared;
		if (carry === null)
			throw new Error("wasm engine: prepared without a running engine to carry from");
		this.carryViews = bindCarry(carry, source, this.views);
	}

	/**
	 * Continue the engine whose memory is `source`, along the carry this
	 * engine was prepared with: copies only, when `bindCarry` ran on the same
	 * memory; else it binds first (allocating).
	 */
	handOver(source: WasmMemory): void {
		if (this.carryViews?.source !== source.f64.buffer) this.bindCarry(source);
		runCarry(this.carryViews as CarryViews);
	}

	/** Continue a snapshot (runtime/live-engine.ts `handOver`); right after construction only. */
	load(state: EngineState): void {
		writeEngineState(this.codec, this.prepared.start.runs, state);
	}

	/**
	 * Fill every seq table for `cycle` ahead of the first block, as the JS
	 * build's warm steps do: the tick then finds its table current. A table
	 * is a pure function of (pattern, seed, lane, cycle), so this changes
	 * timing only, never output.
	 */
	prefill(cycle: number): void {
		this.prepared.compiled.layout.nodes.forEach((node, i) => {
			node.lanes.forEach((lane, l) => {
				if (lane.table !== null) this.tables.fill(i, l, cycle);
			});
		});
	}

	/** A value slot as of the last sample rendered (the engine's `cur`). */
	slot(index: number): number {
		return this.views.f64[this.prepared.compiled.layout.cur / 8 + index] as number;
	}

	/** A node's output for the sample just rendered. Test/tap hook, as the JS engine's. */
	peek(node: number, port: string, lane: number): number {
		return this.slot(slotOf(this.prepared.facts.outputs, node, port, lane));
	}
}
