export type { TestDefinition } from "./cases/types";

// Sources
import { srcOsc } from "./cases/sources/osc";
import { srcSin } from "./cases/sources/sin";
import { srcSaw } from "./cases/sources/saw";
import { srcSqr } from "./cases/sources/sqr";
import { srcTri } from "./cases/sources/tri";
import { srcNoise } from "./cases/sources/noise";
import { srcLfo } from "./cases/sources/lfo";
import { srcLfoVibrato } from "./cases/sources/lfo-vibrato";

// Drums
import { drumsClap } from "./cases/drums/drums-clap";
import { drumsHihat } from "./cases/drums/drums-hihat";
import { drumsKick } from "./cases/drums/drums-kick";
import { drumsKit } from "./cases/drums/drums-kit";
import { drumsSnare } from "./cases/drums/drums-snare";

// Filters
import { bpfModulated } from "./cases/filters/bpf-modulated";
import { bpfResonant } from "./cases/filters/bpf-resonant";
import { bpfStatic } from "./cases/filters/bpf-static";
import { hpfModulated } from "./cases/filters/hpf-modulated";
import { hpfResonant } from "./cases/filters/hpf-resonant";
import { hpfStatic } from "./cases/filters/hpf-static";
import { lpfModulated } from "./cases/filters/lpf-modulated";
import { lpfResonant } from "./cases/filters/lpf-resonant";
import { lpfStatic } from "./cases/filters/lpf-static";
import { notchModulated } from "./cases/filters/notch-modulated";
import { notchResonant } from "./cases/filters/notch-resonant";
import { notchStatic } from "./cases/filters/notch-static";

// Envelopes
import { envAdsrFull } from "./cases/envelopes/env-adsr-full";
import { envAr } from "./cases/envelopes/env-ar";
import { envPad } from "./cases/envelopes/env-pad";
import { envPercussive } from "./cases/envelopes/env-percussive";
import { envPlucky } from "./cases/envelopes/env-plucky";

// Effects
import { delayEcho } from "./cases/effects/delay-echo";
import { delayModulated } from "./cases/effects/delay-modulated";
import { delaySlapback } from "./cases/effects/delay-slapback";
import { tapeSaturated } from "./cases/effects/tape-saturated";
import { tapeSlapback } from "./cases/effects/tape-slapback";
import { tapeWobble } from "./cases/effects/tape-wobble";
import { fxReverb } from "./cases/effects/reverb";
import { fxReverbBig } from "./cases/effects/reverb-big";

// Utilities
import { utilApply } from "./cases/utilities/util-apply";
import { utilGain } from "./cases/utilities/util-gain";
import { utilGainEnv } from "./cases/utilities/util-gain-env";
import { utilMix } from "./cases/utilities/util-mix";
import { utilSah } from "./cases/utilities/util-sah";
import { utilSlew } from "./cases/utilities/util-slew";
import { utilSlewAsym } from "./cases/utilities/util-slew-asym";

// Math
import { mathAbs } from "./cases/math/math-abs";
import { mathAdd } from "./cases/math/math-add";
import { mathClip } from "./cases/math/math-clip";
import { mathDiv } from "./cases/math/math-div";
import { mathInv } from "./cases/math/math-inv";
import { mathMod } from "./cases/math/math-mod";
import { mathRingMod } from "./cases/math/math-ring-mod";
import { mathScale } from "./cases/math/math-scale";
import { mathSub } from "./cases/math/math-sub";

// Logic
import { logicAnd } from "./cases/logic/logic-and";
import { logicEq } from "./cases/logic/logic-eq";
import { logicGte } from "./cases/logic/logic-gte";
import { logicLt } from "./cases/logic/logic-lt";
import { logicNot } from "./cases/logic/logic-not";
import { logicOr } from "./cases/logic/logic-or";

// Timing
import { timeClock } from "./cases/timing/clock";
import { timeClockSwing } from "./cases/timing/clock-swing";
import { timeClockDiv } from "./cases/timing/clock-div";
import { timeClockMult } from "./cases/timing/clock-mult";
import { timeCounter } from "./cases/timing/counter";

// Sequencer
import { seqAlternation } from "./cases/sequencing/seq-alternation";
import { seqBasic } from "./cases/sequencing/seq-basic";
import { seqElongate } from "./cases/sequencing/seq-elongate";
import { seqEuclidean } from "./cases/sequencing/seq-euclidean";
import { seqGlide } from "./cases/sequencing/seq-glide";
import { seqGroups } from "./cases/sequencing/seq-groups";
import { seqMultiply } from "./cases/sequencing/seq-multiply";
import { seqReplicate } from "./cases/sequencing/seq-replicate";
import { seqRests } from "./cases/sequencing/seq-rests";
import { seqSharpsFlats } from "./cases/sequencing/seq-sharps-flats";
import { seqMaybe } from "./cases/sequencing/seq-maybe";
import { seqMaybeProb } from "./cases/sequencing/seq-maybe-prob";

// Polyphony
import { polyArrayDistribute } from "./cases/polyphony/poly-array-distribute";
import { polyArrayGain } from "./cases/polyphony/poly-array-gain";
import { polyArrayLfo } from "./cases/polyphony/poly-array-lfo";
import { polyArrayWrap } from "./cases/polyphony/poly-array-wrap";
import { polyBroadcastFilter } from "./cases/polyphony/poly-broadcast-filter";
import { polyChord7th } from "./cases/polyphony/poly-chord-7th";
import { polyChordStatic } from "./cases/polyphony/poly-chord-static";
import { polyNoiseChord } from "./cases/polyphony/poly-noise-chord";
import { polyPerVoiceState } from "./cases/polyphony/poly-per-voice-state";
import { polySeqChord } from "./cases/polyphony/poly-seq-chord";
import { polySeqMixed } from "./cases/polyphony/poly-seq-mixed";
import { polySequencedChord } from "./cases/polyphony/poly-sequenced-chord";
import { polyStackedFifths } from "./cases/polyphony/poly-stacked-fifths";
import { polyUnisonDetune } from "./cases/polyphony/poly-unison-detune";

// Lambda
import { lambdaApplyBasic } from "./cases/lambda/lambda-apply-basic";
import { lambdaFeedbackEcho } from "./cases/lambda/lambda-feedback-echo";
import { lambdaFeedbackComb } from "./cases/lambda/lambda-feedback-comb";
import { lambdaFeedbackKarplus } from "./cases/lambda/lambda-feedback-karplus";
import { lambdaFeedbackPing } from "./cases/lambda/lambda-feedback-ping";
import { lambdaInlineBinding } from "./cases/lambda/lambda-inline-binding";
import { lambdaNestedApply } from "./cases/lambda/lambda-nested-apply";
import { lambdaLfoRouting } from "./cases/lambda/lambda-lfo-routing";
import { lambdaPolyFeedback } from "./cases/lambda/lambda-poly-feedback";
import { lambdaSidechain } from "./cases/lambda/lambda-sidechain";

import type { TestDefinition } from "./cases/types";

export const tests: TestDefinition[] = [
	// Sources
	srcOsc,
	srcSin,
	srcSaw,
	srcSqr,
	srcTri,
	srcNoise,
	srcLfo,
	srcLfoVibrato,

	// Drums
	drumsKick,
	drumsSnare,
	drumsHihat,
	drumsClap,
	drumsKit,

	// Filters
	lpfStatic,
	lpfResonant,
	lpfModulated,
	hpfStatic,
	hpfResonant,
	hpfModulated,
	bpfStatic,
	bpfResonant,
	bpfModulated,
	notchStatic,
	notchResonant,
	notchModulated,

	// Envelopes
	envAr,
	envPlucky,
	envPad,
	envAdsrFull,
	envPercussive,

	// Effects
	delayEcho,
	delayModulated,
	delaySlapback,
	tapeWobble,
	tapeSaturated,
	tapeSlapback,
	fxReverb,
	fxReverbBig,

	// Utilities
	utilGain,
	utilGainEnv,
	utilMix,
	utilSlew,
	utilSlewAsym,
	utilSah,
	utilApply,

	// Math
	mathAdd,
	mathRingMod,
	mathSub,
	mathDiv,
	mathScale,
	mathClip,
	mathAbs,
	mathInv,
	mathMod,

	// Logic
	logicGte,
	logicLt,
	logicEq,
	logicAnd,
	logicOr,
	logicNot,

	// Timing
	timeClock,
	timeClockSwing,
	timeClockDiv,
	timeClockMult,
	timeCounter,

	// Sequencer
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
	seqMaybe,
	seqMaybeProb,

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
	// Array distribution
	polyArrayDistribute,
	polyArrayWrap,
	polyArrayGain,
	polyArrayLfo,

	// Lambda
	lambdaApplyBasic,
	lambdaFeedbackEcho,
	lambdaFeedbackComb,
	lambdaFeedbackKarplus,
	lambdaFeedbackPing,
	lambdaInlineBinding,
	lambdaNestedApply,
	lambdaLfoRouting,
	lambdaPolyFeedback,
	lambdaSidechain,
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
