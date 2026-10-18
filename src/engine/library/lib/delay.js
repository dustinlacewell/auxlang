/**
 * Feedback delay with a fractional (linearly interpolated) read head. The delay
 * line is a fixed `maxSecs`-second Float32Array allocated once in state();
 * `time` is clamped to it. `mix` crossfades dry/wet; `feedback` re-injects the
 * wet tap. `tone` darkens the repeats: a one-pole lowpass in the feedback
 * path, its cutoff 200 Hz at 0 rising exponentially toward 20 kHz. At 1 (the
 * default) the filter is out of the path, so each repeat is untouched.
 */
defmod(
	"delay",
	{ cat: "effects", doc: "Feedback delay — echoes with a wet/dry mix.", args: ["time", "feedback", "mix", "tone"] },
	({ sr }) => {
		const maxSecs = 4
		const buf = new Float32Array(Math.ceil(maxSecs * sr))
		let w = 0
		let lp = 0
		return ({ in: x = 0, time = secs(0.25), feedback = unit(0.3), mix = unit(0.5), tone = unit(1) }) => {
			const n = buf.length
			const feedbackClamped = Math.max(0, Math.min(0.99, feedback))
			const mixClamped = Math.max(0, Math.min(1, mix))
			const timeClamped = Math.max(0, Math.min(maxSecs, time))
			const readPos = timeClamped * sr
			const i0 = Math.floor(readPos)
			const frac = readPos - i0
			let a = w - i0
			let b = a - 1
			a = ((a % n) + n) % n
			b = ((b % n) + n) % n
			const wet = (buf[a] ?? 0) * (1 - frac) + (buf[b] ?? 0) * frac
			const toneClamped = Math.max(0, Math.min(1, tone))
			let fed = wet
			if (toneClamped < 1) {
				const cutoff = 200 * 100 ** toneClamped
				lp = lp + (wet - lp) * (1 - Math.exp((-2 * Math.PI * cutoff) / sr))
				fed = lp
			} else {
				lp = wet
			}
			buf[w] = x + fed * feedbackClamped
			w = (w + 1) % n
			return x * (1 - mixClamped) + wet * mixClamped
		}
	},
)
