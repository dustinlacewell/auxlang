/**
 * 808-style kick: a sine body whose pitch is swept down by a fast envelope, plus
 * a short click transient. Retriggered on `trig` rising past 0.5. All state is
 * allocated in setup; no tick-time allocation.
 */
defmod(
	"kick",
	{
		cat: "drums",
		doc: "Kick drum.",
		args: ["pitch", "sweep", "decay", "click"],
	},
	({ sr }) => {
		let phase = 0
		let amp = 0
		let pitchEnv = 0
		let clickPhase = 0
		let wasTrig = 0
		return ({ trig = trigPort(), pitch = hz(50), sweep = sig(4), decay = secs(0.3), click = unit(0.3) }) => {
			if (trig > 0.5 && wasTrig <= 0.5) {
				amp = 1
				pitchEnv = 1
				phase = 0
				clickPhase = 0
			}
			wasTrig = trig
			const decayN = Math.max(0.01, decay)
			const clickN = Math.max(0, Math.min(1, click))
			pitchEnv = Math.max(0, pitchEnv - pitchEnv * (1 / (0.03 * sr)) * 10)
			const freq = pitch * (1 + pitchEnv * (sweep - 1))
			phase = (phase + freq / sr) % 1
			const body = Math.sin(phase * Math.PI * 2)
			clickPhase = clickPhase + (pitch * 4) / sr
			const clickEnv = Math.max(0, 1 - clickPhase * 50)
			const clickSound = Math.sin(clickPhase * Math.PI * 2) * clickEnv * clickN
			amp = Math.max(0, amp - amp * (1 / (decayN * sr)) * 3)
			return (body + clickSound) * amp
		}
	},
)
