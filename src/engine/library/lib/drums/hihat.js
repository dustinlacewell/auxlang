/**
 * Hi-hat: six inharmonically-detuned square waves (metallic) mixed with noise
 * (`Math.random()`, the lane's seeded stream), high-passed and enveloped. The
 * six partial frequencies (400 Hz × the classic 808 ratios) are precomputed
 * once in setup — tick does no allocation.
 */

/** Naive square from phase. */
function sq(p) {
	return p < 0.5 ? 1 : -1
}

defmod(
	"hihat",
	{
		cat: "drums",
		doc: "Hi-hat.",
		args: ["decay", "tone", "metal"],
	},
	({ sr }) => {
		let p0 = 0
		let p1 = 0
		let p2 = 0
		let p3 = 0
		let p4 = 0
		let p5 = 0
		const f0 = 400 * 1.0
		const f1 = 400 * 1.4471
		const f2 = 400 * 1.617
		const f3 = 400 * 1.9265
		const f4 = 400 * 2.5028
		const f5 = 400 * 2.6637
		let amp = 0
		let hpState = 0
		let wasTrig = 0
		return ({ trig = trigPort(), decay = secs(0.05), tone = unit(0.6), metal = unit(0.5) }) => {
			if (trig > 0.5 && wasTrig <= 0.5) amp = 1
			wasTrig = trig
			const decayN = Math.max(0.005, decay)
			const toneN = Math.max(0, Math.min(1, tone))
			const metalN = Math.max(0, Math.min(1, metal))
			p0 = (p0 + f0 / sr) % 1
			p1 = (p1 + f1 / sr) % 1
			p2 = (p2 + f2 / sr) % 1
			p3 = (p3 + f3 / sr) % 1
			p4 = (p4 + f4 / sr) % 1
			p5 = (p5 + f5 / sr) % 1
			const metallic = (sq(p0) + sq(p1) + sq(p2) + sq(p3) + sq(p4) + sq(p5)) / 6
			const rawNoise = Math.random() * 2 - 1
			const mixed = metallic * metalN + rawNoise * (1 - metalN)
			const hpCutoff = 4000 + toneN * 8000
			const hpCoef = 1 - Math.exp((-2 * Math.PI * hpCutoff) / sr)
			hpState = hpState + hpCoef * (mixed - hpState)
			const filtered = mixed - hpState
			amp = Math.max(0, amp - amp * (1 / (decayN * sr)) * 5)
			return filtered * amp * 0.7
		}
	},
)
