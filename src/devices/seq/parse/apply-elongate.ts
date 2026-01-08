import type { Beat, Step } from "../types";
import type { ParseResult } from "./types";

/**
 * @n - Elongate: sustain across n beats (tied notes).
 * First beat gets tieStart (gate holds), continuation beats get tie.
 */
export function applyElongate(result: ParseResult, count: number): ParseResult {
	const newBeats: Beat[] = [];

	for (const beat of result.beats) {
		// First beat: mark with tieStart if extending
		const firstBeat: Beat = beat.map((step): Step => {
			if (step.type === "note" && count > 1) {
				return { ...step, dur: 1.0, tieStart: true };
			}
			return { ...step, dur: 1.0 };
		});
		newBeats.push(firstBeat);

		// Continuation beats: mark with tie
		for (let i = 1; i < count; i++) {
			newBeats.push(beat.map((step) => ({ ...step, dur: 1.0, tie: true })));
		}
	}

	return { beats: newBeats };
}

/**
 * @n within a group - extends duration within the beat.
 */
export function applyElongateToSteps(
	steps: Step[],
	count: number,
	baseDuration: number,
): Step[] {
	return steps.map((step) => ({ ...step, dur: baseDuration * count }));
}
