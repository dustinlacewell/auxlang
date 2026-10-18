/**
 * Hand clap: seeded noise (`Math.random()`, the lane's stream) through a
 * band-pass, shaped by the classic four quick bursts + decay tail. The burst
 * start times live in setup (allocated once, never in tick).
 */
defmod(
	"clap",
	{
		cat: "drums",
		doc: "Hand clap.",
		args: ["decay", "tone"],
	},
	({ sr }) => {
		const hitTimes = Float64Array.of(0, 0.008, 0.018, 0.028)
		let sampleCount = 0
		let active = 0
		let lpState = 0
		let hpState = 0
		let wasTrig = 0
		return ({ trig = trigPort(), decay = secs(0.2), tone = unit(0.5) }) => {
			const HIT_DURATION = 0.012
			const HIT_DECAY = 30
			const TAIL_START = 0.025
			if (trig > 0.5 && wasTrig <= 0.5) {
				sampleCount = 0
				active = 1
				lpState = 0
				hpState = 0
			}
			wasTrig = trig
			const decayN = Math.max(0.05, decay)
			const toneN = Math.max(0, Math.min(1, tone))
			if (active === 0) {
				return 0
			}
			const noise = Math.random() * 2 - 1
			const centerFreq = 1000 + toneN * 1500
			const lpFreq = centerFreq * 1.4
			const hpFreq = centerFreq * 0.7
			const lpCoef = Math.exp((-2 * Math.PI * lpFreq) / sr)
			const hpCoef = Math.exp((-2 * Math.PI * hpFreq) / sr)
			lpState = lpState * lpCoef + noise * (1 - lpCoef)
			const hpOut = lpState - hpState
			hpState = hpState + (1 - hpCoef) * hpOut
			const filtered = hpOut * 2
			const timeSec = sampleCount / sr
			let env = 0
			for (let h = 0; h < hitTimes.length; h++) {
				const start = hitTimes[h]
				const end = start + HIT_DURATION
				if (timeSec >= start && timeSec < end) {
					const prog = (timeSec - start) / HIT_DURATION
					env = Math.max(env, Math.exp(-prog * HIT_DECAY) * (0.7 + h * 0.1))
				}
			}
			if (timeSec >= TAIL_START) {
				const tailProg = (timeSec - TAIL_START) / decayN
				env = Math.max(env, Math.exp(-tailProg * 4) * 0.8)
			}
			if (timeSec > decayN * 2 && env < 0.001) active = 0
			sampleCount = sampleCount + 1
			return filtered * env
		}
	},
)
