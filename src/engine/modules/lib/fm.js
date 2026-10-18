/**
 * Two-operator FM voice: a sine carrier at `pitch` phase-modulated by a sine
 * at `ratio`× the carrier frequency, with modulation `index`. index 0 is a
 * clean sine; higher index adds sidebands (brighter, bell/e-piano tones).
 * `ratio` picks the timbre family — integer ratios are harmonic, others clangy.
 * An exact carrier frequency is `fm({ pitch: hz(220) })`.
 *
 * This is the honest single-modulator FM primitive; deeper stacks are built by
 * routing oscillators by hand (an oscillator's `fm` input is linear FM in Hz).
 * Default input is `pitch`, so `seq.pitch.fm(...)` plays the sequence as an FM
 * voice.
 */
defmod(
	"fm",
	{ cat: "sources", doc: "Two-operator FM sine voice — modulation index and carrier:modulator ratio.", args: ["index", "ratio"] },
	({ sr }) => {
		let cphase = 0
		let mphase = 0
		return ({ pitch = semis(69), index = 2, ratio = 1 }) => {
			const carrier = semisToHz(pitch)
			const modFreq = carrier * ratio
			const mod = Math.sin(mphase * Math.PI * 2) * index
			const out = Math.sin((cphase + mod) * Math.PI * 2)
			cphase = (cphase + carrier / sr) % 1
			mphase = (mphase + modFreq / sr) % 1
			return out
		}
	},
)
