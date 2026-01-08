import type { ParseResult } from "./types";

/**
 * , - Stack: combine notes into a polyphonic chord.
 * c4,e4,g4 creates a single step with freqs: [c4, e4, g4]
 *
 * Only supports stacking single notes into chords.
 * Falls back to concatenation for complex inputs.
 */
export function applyStack(
	leftResult: ParseResult,
	rightResult: ParseResult,
): ParseResult {
	const leftBeats = leftResult.beats;
	const rightBeats = rightResult.beats;

	// Only merge when both sides are single-beat, single-step
	if (leftBeats.length !== 1 || rightBeats.length !== 1) {
		return { beats: [...leftBeats, ...rightBeats] };
	}

	const leftBeat = leftBeats[0];
	const rightBeat = rightBeats[0];

	if (!leftBeat || !rightBeat || leftBeat.steps.length !== 1 || rightBeat.steps.length !== 1) {
		return { beats: [...leftBeats, ...rightBeats] };
	}

	const leftStep = leftBeat.steps[0];
	const rightStep = rightBeat.steps[0];

	if (leftStep?.type !== "note" || rightStep?.type !== "note") {
		return { beats: [...leftBeats, ...rightBeats] };
	}

	// Merge frequencies into one polyphonic step
	const combinedFreqs = [...leftStep.freqs, ...rightStep.freqs];
	const mergedStep = { ...leftStep, freqs: combinedFreqs };

	// Take beat-level prob from either side (right takes precedence for c4,e4,g4?)
	const prob = rightBeat.prob ?? leftBeat.prob;
	return { beats: [{ steps: [mergedStep], prob }] };
}
