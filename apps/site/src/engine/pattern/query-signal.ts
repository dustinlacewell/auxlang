import type { Pat, SignalKind } from "./ast";
import type { Ev, Span } from "./event";
import { descend, type QueryCtx, sampleAt, sampledNote } from "./query";
import { hash01 } from "./random";
import { type R, r, radd, rfloor, rmax, rmin, rlt, rtof } from "./rational";

/** Sample child into n equal steps per cycle (sample-and-hold at each step); an unsounding sample is a rest. */
export function querySegment(n: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const cycle = rfloor(span.begin);
	const out: Ev[] = [];
	for (let i = 0; i < n; i++) {
		const begin = radd(r(cycle), r(i, n));
		const end = radd(r(cycle), r(i + 1, n));
		const b = rmax(span.begin, begin);
		const e = rmin(span.end, end);
		if (!rlt(b, e)) continue;
		const sampled = sampleAt(child, begin, descend(ctx, "segment", 0));
		const whole = { begin, end };
		const part = { begin: b, end: e };
		out.push(sampled === null ? { whole, part, value: 0, kind: "rest" } : sampledNote({ whole, part }, sampled));
	}
	return out;
}

/** Continuous generator sampled at the queried point's onset. */
export function querySignal(kind: SignalKind, span: Span, ctx: QueryCtx): Ev[] {
	const value = signalValue(kind, span.begin, ctx);
	return [{ whole: null, part: span, value, kind: "note" }];
}

function signalValue(kind: SignalKind, at: R, ctx: QueryCtx): number {
	const t = rtof(at);
	switch (kind) {
		case "rand":
			// S&H per queried instant: hash the rational position so segment(n)
			// and struct sample distinct values within a cycle (like degrade).
			return hash01(ctx.seed, ctx.path, at.n, at.d);
		case "perlin":
			return perlin1(ctx.seed, ctx.path, t);
		case "sine":
			return 0.5 + 0.5 * Math.sin(2 * Math.PI * t);
		case "saw":
			return t - Math.floor(t);
		case "isaw":
			return 1 - (t - Math.floor(t));
		case "tri": {
			const p = t - Math.floor(t);
			return p < 0.5 ? p * 2 : 2 - p * 2;
		}
		default:
			return 0;
	}
}

/** Value-noise 1D: smoothstep-interpolated hash at integer lattice points. */
function perlin1(seed: number, path: number, t: number): number {
	const i = Math.floor(t);
	const f = t - i;
	const a = hash01(seed, path, i);
	const b = hash01(seed, path, i + 1);
	const s = f * f * (3 - 2 * f);
	return a + (b - a) * s;
}
