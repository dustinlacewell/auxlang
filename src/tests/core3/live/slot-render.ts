/**
 * Test support: render an engine one sample at a time and apply slot writes
 * at fixed samples, the way the worklet applies them between blocks. Each
 * write lands before the sample it names is rendered. Records l/r and
 * optional node outputs per sample.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { Program } from "@/core3/types";
import { createWasmEngine } from "@/core3/wasm/host/create-wasm-engine";

export const SR = 48000;

/** Write `value` to slot `slot` before sample `at` renders. */
export interface SlotWrite {
	readonly at: number;
	readonly slot: number;
	readonly value: number;
}

/** A node output to record: (node, port, lane 0). */
export interface Tap {
	readonly node: number;
	readonly port: string;
}

/** What the harness drives: either engine. */
export interface SlotEngine {
	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void;
	writeSlot(index: number, value: number): void;
	slotValue(index: number): number;
	peek(node: number, port: string, lane: number): number;
}

export interface SlotRun {
	readonly l: Float32Array;
	readonly r: Float32Array;
	/** Per tap, its value at every sample. */
	readonly taps: readonly Float64Array[];
}

export const ENGINES: Readonly<Record<string, (program: Program) => SlotEngine>> = {
	interpreter: (program) =>
		new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program)),
	wasm: (program) => createWasmEngine(program, SR, getRegistry()),
};

export function renderWithWrites(
	engine: SlotEngine,
	samples: number,
	writes: readonly SlotWrite[],
	taps: readonly Tap[] = [],
): SlotRun {
	const l = new Float32Array(samples);
	const r = new Float32Array(samples);
	const series = taps.map(() => new Float64Array(samples));
	for (let k = 0; k < samples; k++) {
		for (const w of writes) if (w.at === k) engine.writeSlot(w.slot, w.value);
		engine.renderBlock(l, r, k, 1);
		taps.forEach((tap, t) => {
			(series[t] as Float64Array)[k] = engine.peek(tap.node, tap.port, 0);
		});
	}
	return { l, r, taps: series };
}

/** The index of the first node running `module`. */
export function nodeOf(program: Program, module: string): number {
	const index = program.nodes.findIndex((n) => n.module === module);
	if (index < 0) throw new Error(`no '${module}' node in the program`);
	return index;
}
