import { defmod } from "../patch/defmod";
import { optional, sig, unit } from "../types";

/**
 * Master output. Two ways to reach the stereo bus:
 *
 *  - `in`: mono/poly lanes auto-placed. Each lane i of n sits at constant-power
 *    position (i+0.5)/n → [-1,1] (n=1 → dead center), summed with 1/√n scaling.
 *    This is the auto-spread for sources that don't carry their own stereo.
 *  - `l` / `r`: pre-panned stereo jacks (a `pan`, or a stereo effect). ALL lanes
 *    of each jack sum straight into that channel — no re-pan. This is how the
 *    panner's constant-power placement survives to the master: `x.pan(p).out()`
 *    connects by name (l→l, r→r); `out({ l, r })` is the general form.
 *
 * The two paths add: a patch may auto-spread some voices while hard-routing
 * others. Both jacks are optional (`def: null`, opt) — unconnected arrives as
 * the NaN "absent" sentinel and contributes nothing. Both paths mix lanes down
 * by 1/√n, so n uncorrelated lanes at equal level keep the power of one.
 *
 * `gain` scales the mixed signal (read from lane 0 — a broadcast knob), then
 * per channel: a DC guard (one-pole high-pass at DC_CUTOFF_HZ, pole derived
 * from the sample rate) and a peak safety clip (transparent below
 * CLIP_THRESHOLD, soft knee into ±1 above it).
 */

/** DC guard corner. Below musical content (−0.12 dB at 30 Hz); time constant ~32 ms. */
const DC_CUTOFF_HZ = 5;

/** Safety clip threshold: −1 dBFS, the usual true-peak ceiling. Below it, output = input. */
const CLIP_THRESHOLD = 10 ** (-1 / 20);

/** One-pole DC blocker pole for a fixed corner frequency, independent of sample rate. */
function dcPole(sr: number): number {
	return Math.exp((-2 * Math.PI * DC_CUTOFF_HZ) / sr);
}

/**
 * Peak safety clip. Identity up to CLIP_THRESHOLD; above it a tanh knee that
 * meets the identity with slope 1 and approaches ±1, so no level ever leaves
 * [-1, 1] and normal levels are never bent.
 */
function safetyClip(x: number): number {
	const a = Math.abs(x);
	if (a <= CLIP_THRESHOLD) return x;
	const room = 1 - CLIP_THRESHOLD;
	const y = CLIP_THRESHOLD + room * Math.tanh((a - CLIP_THRESHOLD) / room);
	return x < 0 ? -y : y;
}

/**
 * Mix all lanes of a reduce-gathered stereo jack down into one channel, by
 * 1/√width like the `in` path. An UNCONNECTED optional jack arrives as a plain
 * number (the NaN "absent" sentinel) → contributes nothing; a constant is one
 * signal and passes as is. A CONNECTED jack arrives as a lane array — a
 * non-finite lane (diverging feedback) is deliberately left to poison the sum
 * so the master's flush guard fires, exactly as it does for the `in` path.
 */
function mixdownJack(jack: Float32Array | number, width: number): number {
	if (typeof jack === "number") return Number.isFinite(jack) ? jack : 0;
	let s = 0;
	for (let l = 0; l < width; l++) s += jack[l] ?? 0;
	return s / Math.sqrt(Math.max(1, width));
}

defmod({
	name: "out",
	category: "utils",
	doc: "The master output; the only thing that makes sound.",
	policy: "reduce",
	ins: { in: optional(sig(null)), gain: unit(0.8), l: optional(sig(null)), r: optional(sig(null)) },
	outs: { l: sig(), r: sig() },
	defaultIn: "in",
	defaultOut: "l",
	state: (sr) => ({ dcxL: 0, dcyL: 0, dcxR: 0, dcyR: 0, dcPole: dcPole(sr) }),
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

		// Stereo jack path: pre-panned l/r lanes mix straight into each channel.
		sumL += mixdownJack(ins.l, width);
		sumR += mixdownJack(ins.r, width);

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

		// One-pole DC block per channel: y = x - x1 + pole*y1
		const pole = s.dcPole as number;
		const yL = sumL - (s.dcxL as number) + pole * (s.dcyL as number);
		s.dcxL = sumL;
		s.dcyL = yL;
		const yR = sumR - (s.dcxR as number) + pole * (s.dcyR as number);
		s.dcxR = sumR;
		s.dcyR = yR;

		o.l = safetyClip(yL);
		o.r = safetyClip(yR);
	},
});
