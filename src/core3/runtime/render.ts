/**
 * Offline renderer: the headless host for the engine. `render` runs a Program
 * for a duration and returns the stereo result; `renderTap` captures one
 * node output per sample for tests. All allocation happens before the loop.
 */

import { getRegistry } from "../module/define";
import type { Program, Registry } from "../types";
import { Core3Engine } from "./engine";

export interface StereoBuffers {
	readonly l: Float32Array;
	readonly r: Float32Array;
}

export function render(
	program: Program,
	seconds: number,
	sampleRate = 48000,
	registry: Registry = getRegistry(),
): StereoBuffers {
	const samples = Math.round(seconds * sampleRate);
	const engine = new Core3Engine(program, sampleRate, registry);
	const l = new Float32Array(samples);
	const r = new Float32Array(samples);
	const frame = new Float32Array(2);
	for (let i = 0; i < samples; i++) {
		engine.tick(frame);
		l[i] = frame[0] as number;
		r[i] = frame[1] as number;
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
	const engine = new Core3Engine(program, 48000, registry);
	const tap = new Float32Array(samples);
	const frame = new Float32Array(2);
	for (let i = 0; i < samples; i++) {
		engine.tick(frame);
		tap[i] = engine.peek(nodeIndex, port, lane);
	}
	return tap;
}
