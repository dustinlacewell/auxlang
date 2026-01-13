/**
 * Legacy test data aggregator.
 * Auto-imports all test definitions from subdirectories.
 */

import type { TestDefinition } from "./types";

// Sources
import { srcSaw } from "./sources/saw";
import { srcSin } from "./sources/sin";
import { srcSqr } from "./sources/sqr";
import { srcTri } from "./sources/tri";
import { srcNoise } from "./sources/noise";
import { srcOsc } from "./sources/osc";
import { srcLfo } from "./sources/lfo";
import { srcLfoVibrato } from "./sources/lfo-vibrato";

// Filters
import { lpfStatic } from "./filters/lpf-static";
import { lpfResonant } from "./filters/lpf-resonant";
import { lpfModulated } from "./filters/lpf-modulated";
import { hpfStatic } from "./filters/hpf-static";
import { hpfResonant } from "./filters/hpf-resonant";
import { hpfModulated } from "./filters/hpf-modulated";
import { bpfStatic } from "./filters/bpf-static";
import { bpfResonant } from "./filters/bpf-resonant";
import { bpfModulated } from "./filters/bpf-modulated";
import { notchStatic } from "./filters/notch-static";
import { notchResonant } from "./filters/notch-resonant";
import { notchModulated } from "./filters/notch-modulated";

// Drums
import { drumsKick } from "./drums/drums-kick";
import { drumsSnare } from "./drums/drums-snare";
import { drumsHihat } from "./drums/drums-hihat";
import { drumsClap } from "./drums/drums-clap";
import { drumsKit } from "./drums/drums-kit";

// Envelopes
import { envAr } from "./envelopes/env-ar";
import { envPlucky } from "./envelopes/env-plucky";
import { envPercussive } from "./envelopes/env-percussive";
import { envPad } from "./envelopes/env-pad";
import { envAdsrFull } from "./envelopes/env-adsr-full";

// Effects
import { delayEcho } from "./effects/delay-echo";
import { delaySlapback } from "./effects/delay-slapback";
import { delayModulated } from "./effects/delay-modulated";
import { fxReverb } from "./effects/reverb";
import { fxReverbBig } from "./effects/reverb-big";
import { tapeSlapback } from "./effects/tape-slapback";
import { tapeSaturated } from "./effects/tape-saturated";
import { tapeWobble } from "./effects/tape-wobble";

// Sequencing
import { seqBasic } from "./sequencing/seq-basic";
import { seqRests } from "./sequencing/seq-rests";
import { seqGroups } from "./sequencing/seq-groups";
import { seqAlternation } from "./sequencing/seq-alternation";
import { seqMultiply } from "./sequencing/seq-multiply";
import { seqReplicate } from "./sequencing/seq-replicate";
import { seqElongate } from "./sequencing/seq-elongate";
import { seqEuclidean } from "./sequencing/seq-euclidean";
import { seqMaybe } from "./sequencing/seq-maybe";
import { seqMaybeProb } from "./sequencing/seq-maybe-prob";
import { seqSharpsFlats } from "./sequencing/seq-sharps-flats";
import { seqGlide } from "./sequencing/seq-glide";

// Timing
import { timeClock } from "./timing/clock";
import { timeClockDiv } from "./timing/clock-div";
import { timeClockMult } from "./timing/clock-mult";
import { timeClockSwing } from "./timing/clock-swing";
import { timeCounter } from "./timing/counter";

// Utilities
import { utilGain } from "./utilities/util-gain";
import { utilGainEnv } from "./utilities/util-gain-env";
import { utilMix } from "./utilities/util-mix";
import { utilSlew } from "./utilities/util-slew";
import { utilSlewAsym } from "./utilities/util-slew-asym";
import { utilSah } from "./utilities/util-sah";
import { utilApply } from "./utilities/util-apply";

// Chords
import { chordMajor } from "./chord/chord-major";
import { chordMinor } from "./chord/chord-minor";
import { chordSeventh } from "./chord/chord-seventh";
import { chordProgression } from "./chord/chord-progression";

// Polyphony
import { polyChordStatic } from "./polyphony/poly-chord-static";
import { polyChord7th } from "./polyphony/poly-chord-7th";
import { polySeqChord } from "./polyphony/poly-seq-chord";
import { polySeqMixed } from "./polyphony/poly-seq-mixed";
import { polySequencedChord } from "./polyphony/poly-sequenced-chord";
import { polyStackedFifths } from "./polyphony/poly-stacked-fifths";
import { polyUnisonDetune } from "./polyphony/poly-unison-detune";
import { polyNoiseChord } from "./polyphony/poly-noise-chord";
import { polyBroadcastFilter } from "./polyphony/poly-broadcast-filter";
import { polyArrayDistribute } from "./polyphony/poly-array-distribute";
import { polyArrayGain } from "./polyphony/poly-array-gain";
import { polyArrayLfo } from "./polyphony/poly-array-lfo";
import { polyArrayWrap } from "./polyphony/poly-array-wrap";
import { polyPerVoiceState } from "./polyphony/poly-per-voice-state";

// Math
import { mathAdd } from "./math/math-add";
import { mathSub } from "./math/math-sub";
import { mathDiv } from "./math/math-div";
import { mathAbs } from "./math/math-abs";
import { mathInv } from "./math/math-inv";
import { mathClip } from "./math/math-clip";
import { mathMod } from "./math/math-mod";
import { mathScale } from "./math/math-scale";
import { mathRingMod } from "./math/math-ring-mod";

// Logic
import { logicGte } from "./logic/logic-gte";
import { logicLt } from "./logic/logic-lt";
import { logicEq } from "./logic/logic-eq";
import { logicAnd } from "./logic/logic-and";
import { logicOr } from "./logic/logic-or";
import { logicNot } from "./logic/logic-not";

// Quantize
import { quantizeChromatic } from "./quantize/quantize-chromatic";
import { quantizeMajor } from "./quantize/quantize-major";
import { quantizePentatonic } from "./quantize/quantize-pentatonic";
import { quantizeBlues } from "./quantize/quantize-blues";
import { quantizeBluesModulated } from "./quantize/quantize-blues-modulated";
import { quantizeDorian } from "./quantize/quantize-dorian";
import { quantizeWholeTone } from "./quantize/quantize-whole-tone";

// Lambda
import { lambdaApplyBasic } from "./lambda/lambda-apply-basic";
import { lambdaNestedApply } from "./lambda/lambda-nested-apply";
import { lambdaInlineLfo } from "./lambda/lambda-inline-lfo";
import { lambdaInlineRamp } from "./lambda/lambda-inline-ramp";
import { lambdaInlineRandom } from "./lambda/lambda-inline-random";
import { lambdaInlineBinding } from "./lambda/lambda-inline-binding";
import { lambdaWobbleBass } from "./lambda/lambda-wobble-bass";
import { lambdaArpSpeed } from "./lambda/lambda-arp-speed";
import { lambdaGlitchDrums } from "./lambda/lambda-glitch-drums";
import { lambdaChaosFm } from "./lambda/lambda-chaos-fm";
import { lambdaSidechain } from "./lambda/lambda-sidechain";
import { lambdaLfoRouting } from "./lambda/lambda-lfo-routing";
import { lambdaDroneTexture } from "./lambda/lambda-drone-texture";

// Stereo
import { stereoTwoVoice } from "./stereo/stereo-two-voice";
import { stereoRoundRobin } from "./stereo/stereo-round-robin";
import { monoCenter } from "./stereo/mono-center";
import { spreadChord } from "./stereo/spread-chord";
import { spreadArp } from "./stereo/spread-arp";
import { spreadPad } from "./stereo/spread-pad";
import { spreadWidthModulated } from "./stereo/spread-width-modulated";

export { TestDefinition };

export const tests: TestDefinition[] = [
	// Sources
	srcSaw,
	srcSin,
	srcSqr,
	srcTri,
	srcNoise,
	srcOsc,
	srcLfo,
	srcLfoVibrato,

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

	// Drums
	drumsKick,
	drumsSnare,
	drumsHihat,
	drumsClap,
	drumsKit,

	// Envelopes
	envAr,
	envPlucky,
	envPercussive,
	envPad,
	envAdsrFull,

	// Effects
	delayEcho,
	delaySlapback,
	delayModulated,
	fxReverb,
	fxReverbBig,
	tapeSlapback,
	tapeSaturated,
	tapeWobble,

	// Sequencing
	seqBasic,
	seqRests,
	seqGroups,
	seqAlternation,
	seqMultiply,
	seqReplicate,
	seqElongate,
	seqEuclidean,
	seqMaybe,
	seqMaybeProb,
	seqSharpsFlats,
	seqGlide,

	// Timing
	timeClock,
	timeClockDiv,
	timeClockMult,
	timeClockSwing,
	timeCounter,

	// Utilities
	utilGain,
	utilGainEnv,
	utilMix,
	utilSlew,
	utilSlewAsym,
	utilSah,
	utilApply,

	// Chords
	chordMajor,
	chordMinor,
	chordSeventh,
	chordProgression,

	// Polyphony
	polyChordStatic,
	polyChord7th,
	polySeqChord,
	polySeqMixed,
	polySequencedChord,
	polyStackedFifths,
	polyUnisonDetune,
	polyNoiseChord,
	polyBroadcastFilter,
	polyArrayDistribute,
	polyArrayGain,
	polyArrayLfo,
	polyArrayWrap,
	polyPerVoiceState,

	// Math
	mathAdd,
	mathSub,
	mathDiv,
	mathAbs,
	mathInv,
	mathClip,
	mathMod,
	mathScale,
	mathRingMod,

	// Logic
	logicGte,
	logicLt,
	logicEq,
	logicAnd,
	logicOr,
	logicNot,

	// Quantize
	quantizeChromatic,
	quantizeMajor,
	quantizePentatonic,
	quantizeBlues,
	quantizeBluesModulated,
	quantizeDorian,
	quantizeWholeTone,

	// Lambda
	lambdaApplyBasic,
	lambdaNestedApply,
	lambdaInlineLfo,
	lambdaInlineRamp,
	lambdaInlineRandom,
	lambdaInlineBinding,
	lambdaWobbleBass,
	lambdaArpSpeed,
	lambdaGlitchDrums,
	lambdaChaosFm,
	lambdaSidechain,
	lambdaLfoRouting,
	lambdaDroneTexture,

	// Stereo
	stereoTwoVoice,
	stereoRoundRobin,
	monoCenter,
	spreadChord,
	spreadArp,
	spreadPad,
	spreadWidthModulated,
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
