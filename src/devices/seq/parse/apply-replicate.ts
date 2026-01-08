import type { Beat, Step } from "../types";
import type { ParseResult } from "./types";

/**
 * !n - Replicate: expand to n separate beats.
 * Each beat is a full copy with duration reset to 1.0.
 */
export function applyReplicate(result: ParseResult, count: number): ParseResult {
	const newBeats: Beat[] = [];

	for (let i = 0; i < count; i++) {
		for (const beat of result.beats) {
			newBeats.push(beat.map((step) => ({ ...step, dur: 1.0 })));
		}
	}

	return { beats: newBeats };
}

/**
 * !n within a group - repeats steps at same duration.
 */
export function applyReplicateToSteps(
	steps: Step[],
	count: number,
	baseDuration: number,
): Step[] {
	const result: Step[] = [];

	for (let i = 0; i < count; i++) {
		for (const step of steps) {
			result.push({ ...step, dur: baseDuration });
		}
	}

	return result;
}
