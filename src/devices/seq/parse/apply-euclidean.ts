import type { Beat } from "../types";
import { euclidean } from "./euclidean";
import type { ParseResult } from "./types";

/**
 * (k,n) - Euclidean: spread k hits over n beats.
 * Uses Bjorklund's algorithm to distribute hits as evenly as possible.
 */
export function applyEuclidean(
	result: ParseResult,
	hits: number,
	totalSteps: number,
): ParseResult {
	const pattern = euclidean(hits, totalSteps);
	const newBeats: Beat[] = [];

	for (const isHit of pattern) {
		if (isHit) {
			// Play the original content on hit positions
			for (const beat of result.beats) {
				newBeats.push(beat.map((step) => ({ ...step, dur: 1.0 })));
			}
		} else {
			// Rest on non-hit positions
			newBeats.push([{ type: "rest", dur: 1.0 }]);
		}
	}

	return { beats: newBeats };
}
