import type { Beat, Step } from "../types";

/**
 * Mark the last note step in a beat array with tieStart.
 * Used for glide and elongate to indicate gate should hold.
 */
export function markLastStepTieStart(beats: Beat[]): void {
	if (beats.length === 0) return;

	const lastBeat = beats[beats.length - 1];
	if (!lastBeat || lastBeat.length === 0) return;

	const lastStep = lastBeat[lastBeat.length - 1];
	if (lastStep?.type === "note") {
		lastBeat[lastBeat.length - 1] = { ...lastStep, tieStart: true };
	}
}

/**
 * Mark the first note step in a beat array with tie.
 * Used for glide to indicate continuation from previous note.
 */
export function markFirstStepTie(beats: Beat[]): void {
	if (beats.length === 0) return;

	const firstBeat = beats[0];
	if (!firstBeat || firstBeat.length === 0) return;

	const firstStep = firstBeat[0];
	if (firstStep?.type === "note") {
		firstBeat[0] = { ...firstStep, tie: true };
	}
}

/**
 * Mark the last step in a step array with tieStart.
 * Used for glide within groups.
 */
export function markLastStepInArrayTieStart(steps: Step[]): void {
	if (steps.length === 0) return;

	const lastStep = steps[steps.length - 1];
	if (lastStep?.type === "note") {
		steps[steps.length - 1] = { ...lastStep, tieStart: true };
	}
}

/**
 * Mark the first step in a step array with tie.
 * Used for glide within groups.
 */
export function markFirstStepInArrayTie(steps: Step[]): void {
	if (steps.length === 0) return;

	const firstStep = steps[0];
	if (firstStep?.type === "note") {
		steps[0] = { ...firstStep, tie: true };
	}
}
