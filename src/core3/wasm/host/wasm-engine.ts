/**
 * A compiled program running in an instance: `renderBlock` has the
 * engine's signature (runtime/live-engine.ts), so the offline host can run
 * either. The instance is made from a `WebAssembly.Module`, which is what a
 * worklet would receive from the host thread (it is structured-cloneable).
 */

import type { NodeRun } from "../../runtime/node-run";
import type { CompiledWasm } from "../program/compile-program";
import { initMemory } from "./init-memory";
import { SeqTables } from "./seq-tables";

/** The engine values an instance starts from. */
export interface WasmStart {
	readonly runs: readonly NodeRun[];
	readonly cur: Float64Array;
}

export class WasmEngine {
	private readonly f64: Float64Array;
	private readonly f32: Float32Array;
	private readonly render: (n: number) => void;
	private readonly tables: SeqTables;

	constructor(
		module: WebAssembly.Module,
		private readonly compiled: CompiledWasm,
		start: WasmStart,
	) {
		const tables = new SeqTables(start.runs, compiled.layout, () => this.f64);
		this.tables = tables;
		const instance = new WebAssembly.Instance(module, {
			env: { fill: (node: number, lane: number, cycle: number) => tables.fill(node, lane, cycle) },
		});
		const memory = instance.exports.memory as WebAssembly.Memory;
		this.f64 = new Float64Array(memory.buffer);
		this.f32 = new Float32Array(memory.buffer);
		this.render = instance.exports.render as (n: number) => void;
		initMemory(this.f64, compiled.layout, start.runs, start.cur);
	}

	/** Advance `n` (at most BLOCK_MAX) samples; write l/r into `outL`/`outR` from `offset`. */
	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void {
		this.render(n);
		const { outL: l, outR: r } = this.compiled.layout;
		outL.set(this.f32.subarray(l / 4, l / 4 + n), offset);
		outR.set(this.f32.subarray(r / 4, r / 4 + n), offset);
	}

	/**
	 * Fill every seq table for `cycle` ahead of the first block, as the JS
	 * build's warm steps do: the tick then finds its table current. A table
	 * is a pure function of (pattern, seed, lane, cycle), so this changes
	 * timing only, never output.
	 */
	prefill(cycle: number): void {
		this.compiled.layout.nodes.forEach((node, i) => {
			node.lanes.forEach((lane, l) => {
				if (lane.table !== null) this.tables.fill(i, l, cycle);
			});
		});
	}

	/** A value slot as of the last sample rendered (the engine's `cur`). */
	slot(index: number): number {
		return this.f64[this.compiled.layout.cur / 8 + index] as number;
	}
}
