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
 * the NaN "absent" sentinel and contributes nothing. Each jack mixes its OWN
 * lanes down by 1/√n (n = that jack's width), so n uncorrelated lanes at equal
 * level keep the power of one, and a mono jack beside a 4-lane jack counts
 * once (the engine does not copy a narrower jack across lanes).
 *
 * `gain` scales the mixed signal (read from lane 0 — a broadcast knob), then
 * per channel: a DC guard (one-pole high-pass at 5 Hz — below musical content,
 * −0.12 dB at 30 Hz, time constant ~32 ms — its pole derived from the sample
 * rate in state()) and a peak safety clip (transparent below −1 dBFS, the usual
 * true-peak ceiling; soft knee into ±1 above it).
 *
 * A stereo sink: outputs `l` and `r` and no default output (MANIFESTO §5).
 */

/** True when `x` is a finite number (Inf - Inf and NaN - NaN are NaN). */
function finite(x) {
	return x - x === 0;
}

/**
 * Peak safety clip. Identity up to `threshold`; above it a tanh knee that
 * meets the identity with slope 1 and approaches ±1, so no level ever leaves
 * [-1, 1] and normal levels are never bent.
 */
function safetyClip(x, threshold) {
	const a = Math.abs(x);
	if (a <= threshold) return x;
	const room = 1 - threshold;
	const y = threshold + room * Math.tanh((a - threshold) / room);
	return x < 0 ? -y : y;
}

/**
 * Mix all lanes of a reduce-gathered stereo jack down into one channel, by
 * 1/√n over the jack's own n lanes, like the `in` path. An UNCONNECTED
 * optional jack arrives as a plain number (the NaN "absent" sentinel) →
 * contributes nothing; a constant is one signal and passes as is. A CONNECTED
 * jack arrives as a lane array — a non-finite lane (diverging feedback) is
 * deliberately left to poison the sum so the master's flush guard fires,
 * exactly as it does for the `in` path.
 */
function mixdownJack(jack) {
	if (typeof jack === "number") return finite(jack) ? jack : 0;
	const n = jack.length;
	let s = 0;
	for (let l = 0; l < n; l++) s += jack[l];
	return s / Math.sqrt(Math.max(1, n));
}

defmod({
	name: "out",
	category: "utils",
	doc: "The master output; the only thing that makes sound.",
	policy: "reduce",
	ins: { in: optional(sig(null)), gain: unit(0.8), l: optional(sig(null)), r: optional(sig(null)) },
	outs: { l: sig(), r: sig() },
	defaultIn: "in",
	state: (sr) => ({
		dcxL: 0,
		dcyL: 0,
		dcxR: 0,
		dcyR: 0,
		dcPole: Math.exp((-2 * Math.PI * 5) / sr),
		clipThreshold: 10 ** (-1 / 20),
	}),
	helpers: { finite, safetyClip, mixdownJack },
	tick: (s, ins, o, _cfg, _sr, _width) => {
		const lanes = ins.in;
		const gains = ins.gain;
		const gain = typeof gains === "number" ? gains : (gains[0] ?? 0.8);
		// Auto-spread path: mono/poly `in` lanes fanned to constant-power positions
		// across `in`'s own width. An unconnected `in` is the number NaN sentinel —
		// contributes nothing; a connected lane array sums raw so a diverging lane
		// still trips the flush.
		const inAbsent = typeof lanes === "number" && !finite(lanes);
		const inWidth = typeof lanes === "number" ? 1 : lanes.length;
		const norm = 1 / Math.sqrt(Math.max(1, inWidth));
		let sumL = 0;
		let sumR = 0;
		if (!inAbsent) {
			for (let l = 0; l < inWidth; l++) {
				const v = typeof lanes === "number" ? lanes : lanes[l];
				const pos = inWidth === 1 ? 0 : ((l + 0.5) / inWidth) * 2 - 1;
				const theta = ((pos + 1) / 2) * (Math.PI / 2);
				sumL += v * Math.cos(theta);
				sumR += v * Math.sin(theta);
			}
		}
		sumL *= norm;
		sumR *= norm;
		// Stereo jack path: pre-panned l/r lanes mix straight into each channel.
		sumL += mixdownJack(ins.l);
		sumR += mixdownJack(ins.r);
		sumL *= gain;
		sumR *= gain;
		// A non-finite bus sample (user NaN lambda, diverging feedback) must not
		// poison the master path: Inf/NaN entering the DC blocker turns into NaN
		// forever (Inf - Inf). Flush to silence and reset the blocker instead.
		if (!finite(sumL) || !finite(sumR)) {
			s.dcxL = 0;
			s.dcyL = 0;
			s.dcxR = 0;
			s.dcyR = 0;
			o.l = 0;
			o.r = 0;
			return;
		}
		// One-pole DC block per channel: y = x - x1 + pole*y1
		const pole = s.dcPole;
		const yL = sumL - s.dcxL + pole * s.dcyL;
		s.dcxL = sumL;
		s.dcyL = yL;
		const yR = sumR - s.dcxR + pole * s.dcyR;
		s.dcxR = sumR;
		s.dcyR = yR;
		o.l = safetyClip(yL, s.clipThreshold);
		o.r = safetyClip(yR, s.clipThreshold);
	},
});
