/**
 * Snare: two detuned sine bodies plus band-passed noise for the wires. Noise
 * is `Math.random()`, the lane's seeded stream. Retriggered on `trig`.
 */
defmod(
	"snare",
	{
		cat: "drums",
		doc: "Snare drum.",
		args: ["pitch", "tone", "decay", "snappy"],
	},
	({ sr }) => {
		let phase1 = 0
		let phase2 = 0
		let bodyAmp = 0
		let noiseAmp = 0
		let lpState = 0
		let hpState = 0
		let wasTrig = 0
		return ({ trig = trigPort(), pitch = hz(180), tone = unit(0.4), decay = secs(0.15), snappy = unit(0.7) }) => {
			if (trig > 0.5 && wasTrig <= 0.5) {
				bodyAmp = 1
				noiseAmp = 1
			}
			wasTrig = trig
			const toneN = Math.max(0, Math.min(1, tone))
			const decayN = Math.max(0.01, decay)
			const snappyN = Math.max(0, Math.min(1, snappy))
			phase1 = (phase1 + pitch / sr) % 1
			phase2 = (phase2 + (pitch * 1.5) / sr) % 1
			const body = Math.sin(phase1 * Math.PI * 2) * 0.7 + Math.sin(phase2 * Math.PI * 2) * 0.3
			bodyAmp = Math.max(0, bodyAmp - bodyAmp * (1 / (decayN * 0.5 * sr)) * 5)
			const rawNoise = Math.random() * 2 - 1
			const hpCutoff = 2000 + snappyN * 4000
			const lpCutoff = 5000 + snappyN * 7000
			const hpCoef = 1 - Math.exp((-2 * Math.PI * hpCutoff) / sr)
			const lpCoef = 1 - Math.exp((-2 * Math.PI * lpCutoff) / sr)
			hpState = hpState + hpCoef * (rawNoise - hpState)
			const hpOut = rawNoise - hpState
			lpState = lpState + lpCoef * (hpOut - lpState)
			noiseAmp = Math.max(0, noiseAmp - noiseAmp * (1 / (decayN * sr)) * 4)
			return body * bodyAmp * toneN + lpState * noiseAmp * (1 - toneN) * 1.5
		}
	},
)
