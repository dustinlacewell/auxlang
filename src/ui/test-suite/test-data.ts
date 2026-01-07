export type { TestDefinition } from "./cases/types";

import { oscSine } from "./cases/oscillators/osc-sine";
import { oscSaw } from "./cases/oscillators/osc-saw";
import { oscSqr } from "./cases/oscillators/osc-sqr";
import { oscTri } from "./cases/oscillators/osc-tri";
import { oscNoise } from "./cases/oscillators/osc-noise";
import { oscLfoPitch } from "./cases/oscillators/osc-lfo-pitch";

import { drumsKick } from "./cases/drums/drums-kick";
import { drumsSnare } from "./cases/drums/drums-snare";
import { drumsHihat } from "./cases/drums/drums-hihat";
import { drumsClap } from "./cases/drums/drums-clap";
import { drumsKit } from "./cases/drums/drums-kit";

import { seqBasic } from "./cases/sequencing/seq-basic";
import { seqRests } from "./cases/sequencing/seq-rests";
import { seqGroups } from "./cases/sequencing/seq-groups";
import { seqMultiply } from "./cases/sequencing/seq-multiply";
import { seqReplicate } from "./cases/sequencing/seq-replicate";
import { seqElongate } from "./cases/sequencing/seq-elongate";
import { seqAlternation } from "./cases/sequencing/seq-alternation";
import { seqEuclidean } from "./cases/sequencing/seq-euclidean";
import { seqSharpsFlats } from "./cases/sequencing/seq-sharps-flats";
import { seqGlide } from "./cases/sequencing/seq-glide";

import { envAr } from "./cases/envelopes/env-ar";
import { envPlucky } from "./cases/envelopes/env-plucky";
import { envPad } from "./cases/envelopes/env-pad";

import { lpfStatic } from "./cases/filters/lpf-static";
import { lpfResonant } from "./cases/filters/lpf-resonant";
import { lpfModulated } from "./cases/filters/lpf-modulated";
import { hpfStatic } from "./cases/filters/hpf-static";

import { delayEcho } from "./cases/effects/delay-echo";

import { utilMix } from "./cases/utilities/util-mix";
import { utilSlew } from "./cases/utilities/util-slew";
import { utilGain } from "./cases/utilities/util-gain";

import { mathRingMod } from "./cases/math/math-ring-mod";
import { mathAdd } from "./cases/math/math-add";

import { clock60 } from "./cases/clock/clock-60";
import { clock140 } from "./cases/clock/clock-140";
import { clockDiv } from "./cases/clock/clock-div";
import { clockCounter } from "./cases/clock/clock-counter";

import { logicGte } from "./cases/logic/logic-gte";
import { logicLt } from "./cases/logic/logic-lt";
import { logicAnd } from "./cases/logic/logic-and";

import { polyChordStatic } from "./cases/polyphony/poly-chord-static";
import { polyChord7th } from "./cases/polyphony/poly-chord-7th";
import { polyUnisonDetune } from "./cases/polyphony/poly-unison-detune";
import { polyBroadcastFilter } from "./cases/polyphony/poly-broadcast-filter";
import { polyPerVoiceState } from "./cases/polyphony/poly-per-voice-state";
import { polySequencedChord } from "./cases/polyphony/poly-sequenced-chord";
import { polyStackedFifths } from "./cases/polyphony/poly-stacked-fifths";
import { polyNoiseChord } from "./cases/polyphony/poly-noise-chord";
import { polySeqChord } from "./cases/polyphony/poly-seq-chord";
import { polySeqMixed } from "./cases/polyphony/poly-seq-mixed";
import { polyUnisonParam } from "./cases/polyphony/poly-unison-param";
import { polyUnison7 } from "./cases/polyphony/poly-unison-7";
import { polyUnisonSubtle } from "./cases/polyphony/poly-unison-subtle";

import type { TestDefinition } from "./cases/types";

export const tests: TestDefinition[] = [
	// Oscillators
	oscSine,
	oscSaw,
	oscSqr,
	oscTri,
	oscNoise,
	oscLfoPitch,
	// Drums
	drumsKick,
	drumsSnare,
	drumsHihat,
	drumsClap,
	drumsKit,
	// Sequencing
	seqBasic,
	seqRests,
	seqGroups,
	seqMultiply,
	seqReplicate,
	seqElongate,
	seqAlternation,
	seqEuclidean,
	seqSharpsFlats,
	seqGlide,
	// Envelopes
	envAr,
	envPlucky,
	envPad,
	// Filters
	lpfStatic,
	lpfResonant,
	lpfModulated,
	hpfStatic,
	// Effects
	delayEcho,
	// Utilities
	utilMix,
	utilSlew,
	utilGain,
	// Math
	mathRingMod,
	mathAdd,
	// Clock
	clock60,
	clock140,
	clockDiv,
	clockCounter,
	// Logic
	logicGte,
	logicLt,
	logicAnd,
	// Polyphony
	polyChordStatic,
	polyChord7th,
	polyUnisonDetune,
	polyBroadcastFilter,
	polyPerVoiceState,
	polySequencedChord,
	polyStackedFifths,
	polyNoiseChord,
	polySeqChord,
	polySeqMixed,
	polyUnisonParam,
	polyUnison7,
	polyUnisonSubtle,
];

export function getTestsByCategory(): Map<string, TestDefinition[]> {
	const byCategory = new Map<string, TestDefinition[]>();
	for (const test of tests) {
		const existing = byCategory.get(test.category);
		if (existing) {
			existing.push(test);
		} else {
			byCategory.set(test.category, [test]);
		}
	}
	return byCategory;
}
