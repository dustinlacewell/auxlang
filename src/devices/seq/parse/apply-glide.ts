import type { Step } from "../types";
import type { ParseResult } from "./types";
import {
	markFirstStepInArrayTie,
	markFirstStepTie,
	markLastStepInArrayTieStart,
	markLastStepTieStart,
} from "./step-markers";

/**
 * _ - Glide: tie left and right elements together (legato).
 * Marks last step of left with tieStart, first step of right with tie.
 *
 * @returns Combined beats with tie markers applied
 */
export function applyGlide(
	leftResult: ParseResult,
	rightResult: ParseResult,
): ParseResult {
	const leftBeats = leftResult.beats;
	const rightBeats = rightResult.beats;

	markLastStepTieStart(leftBeats);
	markFirstStepTie(rightBeats);

	return { beats: [...leftBeats, ...rightBeats] };
}

/**
 * _ within a group - ties steps together for legato.
 *
 * @returns Combined steps with tie markers applied
 */
export function applyGlideToSteps(leftSteps: Step[], rightSteps: Step[]): Step[] {
	markLastStepInArrayTieStart(leftSteps);
	markFirstStepInArrayTie(rightSteps);

	return [...leftSteps, ...rightSteps];
}
