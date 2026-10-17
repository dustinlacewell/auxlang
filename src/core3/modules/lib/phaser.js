/**
 * Phaser: a cascade of first-order allpass stages whose break frequency is
 * swept by an internal LFO, summed with the dry signal. The moving notches this
 * creates are the classic phaser sweep. `stages` sets how many allpasses (more
 * = more notches, thicker; at most the 8 state() allocates), `rate` the LFO
 * speed, `depth` how far the sweep travels, `feedback` re-injects the last
 * stage for resonance, `mix` dry/wet.
 *
 * Each allpass: y = -g·x + xPrev + g·yPrev, with g from the swept coefficient.
 * State holds each stage's one-sample x/y history in flat typed arrays (the
 * module contract wants plain serializable state — no arrays-of-typed-arrays).
 */
defmod(
	"phaser",
	{ cat: "effects", doc: "Swept allpass phaser — moving notches over the dry signal.", args: ["rate", "depth", "mix"], config: { stages: 4 } },
	({ sr, stages }) => {
		let phase = 0
		let last = 0
		const xh = new Float32Array(8)
		const yh = new Float32Array(8)
		return ({ in: x = 0, rate = hz(0.5), depth = unit(0.7), feedback = unit(0.3), mix = unit(0.5) }) => {
			const stageCount = Math.max(1, Math.min(xh.length, stages | 0))
			const depthClamped = Math.max(0, Math.min(1, depth))
			const mixClamped = Math.max(0, Math.min(1, mix))
			const feedbackClamped = Math.max(0, Math.min(0.97, feedback))
			// LFO in [0,1] → allpass coefficient sweeping a low..high range.
			const nextPhase = (phase + rate / sr) % 1
			const lfoValue = 0.5 - 0.5 * Math.cos(2 * Math.PI * nextPhase)
			const g = 0.4 + depthClamped * 0.55 * lfoValue
			let v = x + last * feedbackClamped
			for (let k = 0; k < stageCount; k++) {
				const xk = v
				const yk = -g * xk + xh[k] + g * yh[k]
				xh[k] = xk
				yh[k] = yk
				v = yk
			}
			last = v
			phase = nextPhase
			return x * (1 - mixClamped) + v * mixClamped
		}
	},
)
