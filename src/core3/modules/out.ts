import { optional, sig, unit } from "../types";
import { defineReduce } from "./define-typed";

/**
 * Master output. Two ways to reach the stereo bus:
 *
 *  - `in`: mono/poly lanes auto-placed. Each lane i of n sits at constant-power
 *    position (i+0.5)/n → [-1,1] (n=1 → dead center), summed with 1/√n scaling.
 *    This is the auto-spread for sources that don't carry their own stereo.
 *  - `l` / `r`: pre-panned stereo jacks (a `pan`, or a stereo effect). ALL lanes
 *    of each jack sum straight into that channel — no re-pan. This is how the
 *    panner's constant-power placement survives to the master: patch it as
 *    `out({ l: x.l, r: x.r })`.
 *
 * The two paths add: a patch may auto-spread some voices while hard-routing
 * others. Both jacks are optional (`def: null`, opt) — unconnected arrives as
 * the NaN "absent" sentinel and contributes nothing.
 *
 * `gain` scales the pre-clip signal (read from lane 0 — a broadcast knob), then
 * a one-pole DC blocker and a tanh soft-clip run per channel on the final sums.
 */
const DC = 0.999;

/**
 * Sum all lanes of a reduce-gathered stereo jack straight into one channel.
 * An UNCONNECTED optional jack arrives as a plain number (the NaN "absent"
 * sentinel) → contributes nothing. A CONNECTED jack arrives as a lane array;
 * its lanes sum raw — a non-finite lane (diverging feedback) is deliberately
 * left to poison the sum so the master's flush guard fires, exactly as it does
 * for the `in` path.
 */
function sumLanes(jack: Float32Array | number, width: number): number {
	if (typeof jack === "number") return Number.isFinite(jack) ? jack : 0;
	let s = 0;
	for (let l = 0; l < width; l++) s += jack[l] ?? 0;
	return s;
}

export const out = defineReduce({
	name: "out",
	ins: { in: optional(sig(null)), gain: unit(0.8), l: optional(sig(null)), r: optional(sig(null)) },
	outs: { l: sig(), r: sig() },
	defaultIn: "in",
	defaultOut: "l",
	state: () => ({ dcxL: 0, dcyL: 0, dcxR: 0, dcyR: 0 }),
	tick: (s, ins, o, _cfg, _sr, width) => {
		const lanes = ins.in;
		const gains = ins.gain;
		const gain = typeof gains === "number" ? gains : (gains[0] ?? 0.8);
		const norm = 1 / Math.sqrt(Math.max(1, width));

		// Auto-spread path: mono/poly `in` lanes fanned to constant-power positions.
		// An unconnected `in` is the number NaN sentinel — contributes nothing; a
		// connected lane array sums raw so a diverging lane still trips the flush.
		const inAbsent = typeof lanes === "number" && !Number.isFinite(lanes);
		let sumL = 0;
		let sumR = 0;
		if (!inAbsent) {
			for (let l = 0; l < width; l++) {
				const v = typeof lanes === "number" ? lanes : (lanes[l] ?? 0);
				const pos = width === 1 ? 0 : ((l + 0.5) / width) * 2 - 1;
				const theta = ((pos + 1) / 2) * (Math.PI / 2);
				sumL += v * Math.cos(theta);
				sumR += v * Math.sin(theta);
			}
		}
		sumL *= norm;
		sumR *= norm;

		// Stereo jack path: pre-panned l/r lanes sum straight into each channel.
		sumL += sumLanes(ins.l, width);
		sumR += sumLanes(ins.r, width);

		sumL *= gain;
		sumR *= gain;

		// A non-finite bus sample (user NaN lambda, diverging feedback) must not
		// poison the master path: Inf/NaN entering the DC blocker turns into NaN
		// forever (Inf - Inf). Flush to silence and reset the blocker instead.
		if (!Number.isFinite(sumL) || !Number.isFinite(sumR)) {
			s.dcxL = 0;
			s.dcyL = 0;
			s.dcxR = 0;
			s.dcyR = 0;
			o.l = 0;
			o.r = 0;
			return;
		}

		// One-pole DC block per channel: y = x - x1 + DC*y1
		const yL = sumL - (s.dcxL as number) + DC * (s.dcyL as number);
		s.dcxL = sumL;
		s.dcyL = yL;
		const yR = sumR - (s.dcxR as number) + DC * (s.dcyR as number);
		s.dcxR = sumR;
		s.dcyR = yR;

		o.l = Math.tanh(yL);
		o.r = Math.tanh(yR);
	},
});
