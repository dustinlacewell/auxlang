import { defmod } from "../patch/defmod";
import { sig } from "../types";
import { semisToHz } from "../units/pitch";
import { semis } from "../units/tag";

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
defmod({
	name: "fm",
	category: "sources",
	doc: "Two-operator FM sine voice — modulation index and carrier:modulator ratio.",
	ins: {
		pitch: semis(69),
		index: sig(2),
		ratio: sig(1),
	},
	outs: { out: sig() },
	defaultIn: "pitch",
	defaultOut: "out",
	positional: ["index", "ratio"],
	state: () => ({ cphase: 0, mphase: 0 }),
	tick: (s, i, o, _cfg, sr) => {
		const carrier = semisToHz(i.pitch);
		const modFreq = carrier * i.ratio;

		const mphase = s.mphase as number;
		const mod = Math.sin(mphase * Math.PI * 2) * i.index;

		const cphase = s.cphase as number;
		o.out = Math.sin((cphase + mod) * Math.PI * 2);

		s.cphase = (cphase + carrier / sr) % 1;
		s.mphase = (mphase + modFreq / sr) % 1;
	},
});
