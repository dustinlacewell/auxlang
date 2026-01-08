import type { Beat, Step } from "../types";
import type { ParseResult } from "./types";

/**
 * *n - Multiply: repeat n times within the same beat.
 * Each repetition has duration divided by count.
 */
export function applyMultiply(result: ParseResult, count: number): ParseResult {
	const newBeats: Beat[] = [];

	for (const beat of result.beats) {
		const newSteps: Step[] = [];
		for (let i = 0; i < count; i++) {
			for (const step of beat) {
				newSteps.push({ ...step, dur: step.dur / count });
			}
		}
		newBeats.push(newSteps);
	}

	return { beats: newBeats };
}

/**
 * *<1 2 3> - Multiply with alternating counts.
 * Each cycle uses a different repetition count.
 */
export function applyMultiplyWithAlternation(
	result: ParseResult,
	counts: number[],
): ParseResult {
	if (counts.length === 0) {
		return result;
	}

	const cycleTotal = counts.length;
	const newBeats: Beat[] = [];

	for (const beat of result.beats) {
		const allSteps: Step[] = [];

		for (let cycleIndex = 0; cycleIndex < cycleTotal; cycleIndex++) {
			const count = counts[cycleIndex] ?? 1;

			for (let i = 0; i < count; i++) {
				for (const step of beat) {
					allSteps.push({
						...step,
						dur: step.dur / count,
						cycle: cycleIndex,
						cycleTotal,
					});
				}
			}
		}

		newBeats.push(allSteps);
	}

	return { beats: newBeats };
}

/**
 * *n within a group - subdivides steps within their allocation.
 */
export function applyMultiplyToSteps(steps: Step[], count: number): Step[] {
	const result: Step[] = [];

	for (let i = 0; i < count; i++) {
		for (const step of steps) {
			result.push({ ...step, dur: step.dur / count });
		}
	}

	return result;
}

/**
 * *<1 2 3> within a group - alternating multiply counts.
 */
export function applyMultiplyToStepsWithAlternation(
	steps: Step[],
	counts: number[],
): Step[] {
	if (counts.length === 0) {
		return steps;
	}

	const cycleTotal = counts.length;
	const result: Step[] = [];

	for (let cycleIndex = 0; cycleIndex < cycleTotal; cycleIndex++) {
		const count = counts[cycleIndex] ?? 1;

		for (let i = 0; i < count; i++) {
			for (const step of steps) {
				result.push({
					...step,
					dur: step.dur / count,
					cycle: cycleIndex,
					cycleTotal,
				});
			}
		}
	}

	return result;
}
