import type { Step } from "../types";
import type { ParseResult } from "./types";

/**
 * ? - Maybe: set beat-level probability.
 * When applied to a group/alternation, rolls once per beat.
 * When applied to individual notes, rolls per step.
 */
export function applyMaybe(result: ParseResult, prob = 0.5): ParseResult {
	return {
		beats: result.beats.map((beat) => ({
			...beat,
			prob,
		})),
	};
}

/**
 * ? within a group on individual items - applies probability to steps.
 * This is for patterns like [c4? e4? g4?] where each note rolls independently.
 */
export function applyMaybeToSteps(steps: Step[], prob = 0.5): Step[] {
	return steps.map((step) => ({ ...step, prob }));
}
