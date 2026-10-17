/**
 * Master output. Two ways to reach the stereo bus:
 *
 *  - `in`: mono/poly lanes summed and placed dead center — no spread. Widening
 *    is `spread()` (or `pan`) upstream of `out`; `out` itself never re-places.
 *  - `l` / `r`: pre-panned stereo jacks (a `pan`, or a stereo effect). ALL lanes
 *    of each jack sum straight into that channel — no re-pan. This is how the
 *    panner's constant-power placement survives to the master: `x.pan(p).out()`
 *    connects by name (l→l, r→r); `out({ l, r })` is the general form.
 *
 * The two paths add: a patch may send a centered sum while hard-routing other
 * voices through l/r. Both jacks are optional (`def: null`, opt) — unconnected
 * arrives as the NaN "absent" sentinel and contributes nothing. Each jack mixes
 * its OWN lanes down by 1/√n (n = that jack's width), so n uncorrelated lanes
 * at equal level keep the power of one, and a mono jack beside a 4-lane jack
 * counts once (the engine does not copy a narrower jack across lanes).
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
	return x - x === 0
}

/**
 * Peak safety clip. Identity up to `threshold`; above it a tanh knee that
 * meets the identity with slope 1 and approaches ±1, so no level ever leaves
 * [-1, 1] and normal levels are never bent.
 */
function safetyClip(x, threshold) {
	const a = Math.abs(x)
	if (a <= threshold) {
		return x
	}
	const room = 1 - threshold
	const y = threshold + room * Math.tanh((a - threshold) / room)
	return x < 0 ? -y : y
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
	if (typeof jack === "number") {
		return finite(jack) ? jack : 0
	}
	const n = jack.length
	let s = 0
	for (let l = 0; l < n; l++) s += jack[l]
	return s / Math.sqrt(Math.max(1, n))
}

defmod(
	"out",
	{
		cat: "utils",
		doc: "The master output; the only thing that makes sound. `in` lanes sum to center — widen with spread() or pan first.",
		reduce: true,
	},
	({ sr }) => {
		let dcxL = 0
		let dcyL = 0
		let dcxR = 0
		let dcyR = 0
		const dcPole = Math.exp((-2 * Math.PI * 5) / sr)
		const clipThreshold = 10 ** (-1 / 20)
		return ({ in: lanes = NaN, gain = unit(0.8), l: lJack = NaN, r: rJack = NaN }) => {
			const gains = gain
			const theGain = typeof gains === "number" ? gains : (gains[0] ?? 0.8)
			// Center path: mono/poly `in` lanes summed and placed dead center — no
			// spread (that is spread()/pan's job upstream of out). The center gain is
			// the old width-1 case's theta = π/4, hoisted outside the lane loop so
			// width-1 renders stay bit-identical; a literal-argument Math.cos/sin call
			// is cache-cheap (cache-call.ts: a literal is never compared, every call
			// takes the fast path), so this costs the same as a baked-in constant. An
			// unconnected `in` is the number NaN sentinel — contributes nothing; a
			// connected lane array sums raw so a diverging lane still trips the flush.
			const inAbsent = typeof lanes === "number" && !finite(lanes)
			const inWidth = typeof lanes === "number" ? 1 : lanes.length
			const norm = 1 / Math.sqrt(Math.max(1, inWidth))
			const centerTheta = Math.PI / 4
			const centerL = Math.cos(centerTheta)
			const centerR = Math.sin(centerTheta)
			let sumL = 0
			let sumR = 0
			if (!inAbsent) {
				for (let l = 0; l < inWidth; l++) {
					const v = typeof lanes === "number" ? lanes : lanes[l]
					sumL += v
					sumR += v
				}
			}
			sumL *= norm * centerL
			sumR *= norm * centerR
			// Stereo jack path: pre-panned l/r lanes mix straight into each channel.
			sumL += mixdownJack(lJack)
			sumR += mixdownJack(rJack)
			sumL *= theGain
			sumR *= theGain
			// A non-finite bus sample (user NaN lambda, diverging feedback) must not
			// poison the master path: Inf/NaN entering the DC blocker turns into NaN
			// forever (Inf - Inf). Flush to silence and reset the blocker instead.
			if (!finite(sumL) || !finite(sumR)) {
				dcxL = 0
				dcyL = 0
				dcxR = 0
				dcyR = 0
				return { l: 0, r: 0 }
			}
			// One-pole DC block per channel: y = x - x1 + pole*y1
			const yL = sumL - dcxL + dcPole * dcyL
			dcxL = sumL
			dcyL = yL
			const yR = sumR - dcxR + dcPole * dcyR
			dcxR = sumR
			dcyR = yR
			return { l: safetyClip(yL, clipThreshold), r: safetyClip(yR, clipThreshold) }
		}
	},
)
