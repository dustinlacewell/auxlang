/**
 * Offline renderer: the headless host for the engine. `render` runs a Program
 * for a duration in worklet-sized blocks and returns the stereo result;
 * `renderTap` captures one node output per sample for tests. All allocation
 * happens before the loop.
 */

import { getRegistry } from "../module/define";
import type { Program, Registry } from "../types";
import { Core3Engine, type EngineOptions } from "./engine";
import { withProgramSpecs } from "./hydrate-specs";

/** Samples per engine block: the AudioWorklet render quantum. */
const BLOCK = 128;

export interface StereoBuffers {
	readonly l: Float32Array;
	readonly r: Float32Array;
}

export function render(
	program: Program,
	seconds: number,
	sampleRate = 48000,
	registry: Registry = getRegistry(),
	options: EngineOptions = {},
): StereoBuffers {
	const samples = Math.round(seconds * sampleRate);
	const engine = new Core3Engine(
		program,
		sampleRate,
		withProgramSpecs(registry, program),
		undefined,
		options,
	);
	const l = new Float32Array(samples);
	const r = new Float32Array(samples);
	for (let at = 0; at < samples; at += BLOCK) {
		engine.renderBlock(l, r, at, Math.min(BLOCK, samples - at));
	}
	return { l, r };
}

export function renderTap(
	program: Program,
	nodeIndex: number,
	port: string,
	lane: number,
	samples: number,
	registry: Registry = getRegistry(),
): Float32Array {
	const engine = new Core3Engine(program, 48000, withProgramSpecs(registry, program));
	const tap = new Float32Array(samples);
	const frame = new Float32Array(2);
	for (let i = 0; i < samples; i++) {
		engine.tick(frame);
		tap[i] = engine.peek(nodeIndex, port, lane);
	}
	return tap;
}
