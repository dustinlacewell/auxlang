import type { ModuleSpec } from "@/core3/types";

/**
 * Test harness that drives a ModuleSpec's tick() directly — no engine.
 * state = spec.state(sr); ins/outs are plain records. This mirrors exactly
 * what the engine does per lane, minus port-source resolution.
 */

export const SR = 48000;

export type Ins = Record<string, number>;
export type Outs = Record<string, number>;

/** Fill an outs record with every declared output port, zeroed. */
export function freshOuts(spec: ModuleSpec): Outs {
	const o: Outs = {};
	for (const k of Object.keys(spec.outs)) o[k] = 0;
	return o;
}

/**
 * Merge input defaults with overrides. A null-default port stays `null` (the
 * engine passes null for an unconnected optional input — e.g. osc `freq`), so
 * modules that branch on `i.freq !== null` behave as they do live.
 */
export function defaultsIns(spec: ModuleSpec, over: Ins = {}): Ins {
	const i: Record<string, number | null> = {};
	for (const [k, ann] of Object.entries(spec.ins)) {
		i[k] = ann.def;
	}
	return { ...i, ...over } as Ins;
}

export interface Driver {
	state: Record<string, unknown>;
	config: Record<string, unknown>;
	/** One map tick. `over` overrides input defaults. Returns the outs record. */
	step(over?: Ins): Outs;
	/** Run n ticks with constant inputs, return the last outs. */
	run(n: number, over?: Ins): Outs;
	/** Run n ticks, collecting one named output per sample. */
	trace(n: number, port: string, over?: Ins): number[];
}

/** Build a map-policy driver over a spec. */
export function driver(spec: ModuleSpec, config: Record<string, unknown> = {}, sr = SR): Driver {
	const state = spec.state ? spec.state(sr) : {};
	const cfg = { ...(spec.config ?? {}), ...config };
	const tick = spec.tick as (
		s: Record<string, unknown>,
		i: Ins,
		o: Outs,
		c: Record<string, unknown>,
		sr: number,
	) => void;
	const step = (over: Ins = {}): Outs => {
		const ins = defaultsIns(spec, over);
		const outs = freshOuts(spec);
		tick(state, ins, outs, cfg, sr);
		return outs;
	};
	const run = (n: number, over: Ins = {}): Outs => {
		let last: Outs = freshOuts(spec);
		for (let k = 0; k < n; k++) last = step(over);
		return last;
	};
	const trace = (n: number, port: string, over: Ins = {}): number[] => {
		const out: number[] = [];
		for (let k = 0; k < n; k++) out.push(step(over)[port] ?? 0);
		return out;
	};
	return { state, config: cfg, step, run, trace };
}

/** Build a reduce-policy driver: inputs supplied as per-port lane arrays (or numbers). */
export function reduceDriver(
	spec: ModuleSpec,
	width: number,
	config: Record<string, unknown> = {},
	sr = SR,
) {
	const state = spec.state ? spec.state(sr) : {};
	const cfg = { ...(spec.config ?? {}), ...config };
	const tick = spec.tick as (
		s: Record<string, unknown>,
		i: Record<string, Float32Array | number>,
		o: Outs,
		c: Record<string, unknown>,
		sr: number,
		w: number,
	) => void;
	const step = (laneIns: Record<string, Float32Array | number>): Outs => {
		const outs = freshOuts(spec);
		// fill any missing input port with its default broadcast
		const ins: Record<string, Float32Array | number> = {};
		for (const [k, ann] of Object.entries(spec.ins)) {
			ins[k] = ann.def == null ? 0 : ann.def;
		}
		Object.assign(ins, laneIns);
		tick(state, ins, outs, cfg, sr, width);
		return outs;
	};
	return { state, config: cfg, step };
}

/** Detect sign changes (positive-going zero crossings) and return their sample indices. */
export function upCrossings(xs: number[]): number[] {
	const idx: number[] = [];
	for (let k = 1; k < xs.length; k++) {
		if (xs[k - 1]! <= 0 && xs[k]! > 0) idx.push(k);
	}
	return idx;
}

/** Estimate dominant period (in samples) from up-crossings; NaN if < 2. */
export function periodFromCrossings(xs: number[]): number {
	const cr = upCrossings(xs);
	if (cr.length < 2) return Number.NaN;
	let sum = 0;
	for (let k = 1; k < cr.length; k++) sum += cr[k]! - cr[k - 1]!;
	return sum / (cr.length - 1);
}

export function rms(xs: number[]): number {
	let s = 0;
	for (const x of xs) s += x * x;
	return Math.sqrt(s / xs.length);
}

export function maxAbs(xs: number[]): number {
	let m = 0;
	for (const x of xs) m = Math.max(m, Math.abs(x));
	return m;
}
