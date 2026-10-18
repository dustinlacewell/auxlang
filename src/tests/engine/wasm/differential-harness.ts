/**
 * The WASM differential's harness: render a program on the interpreter (one
 * sample per tick, the reference) and on WASM (uneven blocks, so state kept
 * in locals and memory is crossed often and at odd points), and assert they
 * agree bit for bit, outputs and lane states.
 */

import { getRegistry } from "@/engine/module/define";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import type { EngineState, Program } from "@/engine/types";
import { createWasmEngine } from "@/engine/wasm/host/create-wasm-engine";
import { expect } from "vitest";

export const SR = 48000;

export interface Run {
	readonly l: Float32Array;
	readonly r: Float32Array;
	readonly state: EngineState;
}

interface Renders {
	tick(out: Float32Array): void;
	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void;
	collectState(): EngineState;
}

/** Block sizes WASM renders in, cycled: the worklet quantum and odd sizes, each at most BLOCK_MAX. */
const BLOCKS = [128, 1, 77, 128, 3, 113, 64];

/** The interpreter, ticked one sample at a time: the reference. */
export function interpreterRun(program: Program, samples = SR): Run {
	const registry = withProgramSpecs(getRegistry(), program);
	return renderTicks(new Core3Engine(program, SR, registry), samples);
}

/** WASM, in uneven blocks. */
export function wasmRun(program: Program, samples = SR): Run {
	return renderBlocks(createWasmEngine(program, SR, getRegistry()), samples);
}

export function renderTicks(engine: Renders, samples: number): Run {
	const l = new Float32Array(samples);
	const r = new Float32Array(samples);
	const frame = new Float32Array(2);
	for (let i = 0; i < samples; i++) {
		engine.tick(frame);
		l[i] = frame[0] as number;
		r[i] = frame[1] as number;
	}
	return { l, r, state: engine.collectState() };
}

export function renderBlocks(engine: Renders, samples: number): Run {
	const l = new Float32Array(samples);
	const r = new Float32Array(samples);
	for (let at = 0, b = 0; at < samples; b++) {
		const n = Math.min(BLOCKS[b % BLOCKS.length] as number, samples - at);
		engine.renderBlock(l, r, at, n);
		at += n;
	}
	return { l, r, state: engine.collectState() };
}

/** Index of the first sample whose bits differ; -1 when identical. */
export function firstBitDiff(a: Float32Array, b: Float32Array): number {
	const ua = new Uint32Array(a.buffer);
	const ub = new Uint32Array(b.buffer);
	for (let i = 0; i < ua.length; i++) if (ua[i] !== ub[i]) return i;
	return -1;
}

/** Asserts `run` matches `ref` bit for bit, outputs and state. */
export function expectSameRun(ref: Run, run: Run, label: string): void {
	expect(firstBitDiff(ref.l, run.l), `${label}: first differing left sample`).toBe(-1);
	expect(firstBitDiff(ref.r, run.r), `${label}: first differing right sample`).toBe(-1);
	expect(run.state, `${label}: state`).toEqual(ref.state);
}

/** Asserts WASM agrees with the interpreter; returns the interpreter's run. */
export function expectIdentical(program: Program, samples = SR): Run {
	const ref = interpreterRun(program, samples);
	expectSameRun(ref, wasmRun(program, samples), "wasm");
	return ref;
}
