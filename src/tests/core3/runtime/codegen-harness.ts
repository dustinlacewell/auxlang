/**
 * The codegen gate's harness: render a program with the interpreter (one
 * sample per tick, the reference) and with the generated driver (uneven
 * blocks, so state kept in locals is stored back often and at odd points),
 * and assert both agree bit for bit, outputs and lane states.
 */

import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { EngineState, Program } from "@/core3/types";
import { expect } from "vitest";

export const SR = 48000;

export interface Run {
	readonly l: Float32Array;
	readonly r: Float32Array;
	readonly state: EngineState;
}

/** Block sizes the generated driver renders in, cycled: the worklet quantum plus odd sizes. */
const BLOCKS = [128, 1, 77, 128, 3, 128, 64];

export function run(program: Program, codegen: boolean, samples = SR): Run {
	const registry = withProgramSpecs(getRegistry(), program);
	return render(new Core3Engine(program, SR, registry, undefined, { codegen }), samples, codegen);
}

/** The interpreter ticks one sample at a time (the reference); codegen renders in blocks. */
export function render(engine: Core3Engine, samples: number, codegen: boolean): Run {
	const l = new Float32Array(samples);
	const r = new Float32Array(samples);
	if (!codegen) {
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

/** Asserts both drivers agree; returns the interpreter's run. */
export function expectIdentical(program: Program, samples = SR): Run {
	const ref = run(program, false, samples);
	const gen = run(program, true, samples);
	expect(firstBitDiff(ref.l, gen.l), "first differing left sample").toBe(-1);
	expect(firstBitDiff(ref.r, gen.r), "first differing right sample").toBe(-1);
	expect(gen.state).toEqual(ref.state);
	return ref;
}
