/**
 * The codegen gate's harness: render a program with the interpreter (one
 * sample per tick, the reference) and with each generated driver (uneven
 * blocks, so state kept in locals and block buffers is crossed often and at
 * odd points), and assert they agree bit for bit, outputs and lane states.
 */

import { getRegistry } from "@/core3/module/define";
import { Core3Engine, type EngineOptions } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { EngineState, Program } from "@/core3/types";
import { expect } from "vitest";

export const SR = 48000;

export interface Run {
	readonly l: Float32Array;
	readonly r: Float32Array;
	readonly state: EngineState;
}

/** The interpreter: the reference, ticked one sample at a time. */
export const INTERPRETER: EngineOptions = {};

/**
 * The generated drivers under test: phase 1 (call sites), phase 2 (grouped,
 * pasted), and tier-up switching from phase 1 to phase 2 mid-render. In the
 * BLOCKS cycle its shadow runs slices 1, 2, 4, 2, 16, 32, 43 (100 samples)
 * beside blocks 1 to 7 (from 0), and phase 2 takes over at sample 829.
 */
export const GENERATED: readonly { readonly label: string; readonly options: EngineOptions }[] = [
	{ label: "phase 1", options: { codegen: true } },
	{ label: "phase 2", options: { codegen: true, paste: true } },
	{
		label: "tier-up",
		options: {
			codegen: true,
			tierUp: true,
			tier: { startAfter: 1, fraction: 1 / 2, warmSamples: 100 },
		},
	},
];

/** Block sizes generated drivers render in, cycled: the worklet quantum, odd sizes, and over BLOCK_MAX. */
const BLOCKS = [128, 1, 77, 128, 3, 300, 64];

export function run(program: Program, options: EngineOptions, samples = SR): Run {
	const registry = withProgramSpecs(getRegistry(), program);
	return render(new Core3Engine(program, SR, registry, undefined, options), samples, options);
}

/** The interpreter ticks one sample at a time (the reference); codegen renders in blocks. */
export function render(engine: Core3Engine, samples: number, options: EngineOptions): Run {
	const l = new Float32Array(samples);
	const r = new Float32Array(samples);
	if (!(options.codegen ?? false)) {
		const frame = new Float32Array(2);
		for (let i = 0; i < samples; i++) {
			engine.tick(frame);
			l[i] = frame[0] as number;
			r[i] = frame[1] as number;
		}
		return { l, r, state: engine.collectState() };
	}
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

/** Asserts `gen` matches `ref` bit for bit, outputs and state. */
export function expectSameRun(ref: Run, gen: Run, label: string): void {
	expect(firstBitDiff(ref.l, gen.l), `${label}: first differing left sample`).toBe(-1);
	expect(firstBitDiff(ref.r, gen.r), `${label}: first differing right sample`).toBe(-1);
	expect(gen.state, `${label}: state`).toEqual(ref.state);
}

/** Asserts every generated driver agrees with the interpreter; returns the interpreter's run. */
export function expectIdentical(program: Program, samples = SR): Run {
	const ref = run(program, INTERPRETER, samples);
	for (const { label, options } of GENERATED)
		expectSameRun(ref, run(program, options, samples), label);
	return ref;
}
