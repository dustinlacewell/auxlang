import type { Step } from "../types";
import type { TokenStream } from "./token-stream";
import type { ParseResult } from "./types";

/**
 * Parse alternation <a b c> at top level.
 * Cycles through alternatives on each pattern repetition.
 *
 * @param parseElementWithModifiers - Callback to parse each alternative
 */
export function parseAlternate(
	stream: TokenStream,
	parseElementWithModifiers: () => ParseResult,
): ParseResult {
	stream.expect("LANGLE");

	const alternateCount = stream.countItemsUntil("RANGLE");
	const allSteps: Step[] = [];
	let cycleIndex = 0;

	while (!stream.check("RANGLE") && !stream.isAtEnd()) {
		const result = parseElementWithModifiers();

		// Tag each step with its cycle index
		for (const beat of result.beats) {
			for (const step of beat.steps) {
				allSteps.push({
					...step,
					cycle: cycleIndex,
					cycleTotal: alternateCount,
				});
			}
		}

		cycleIndex++;
	}

	stream.expect("RANGLE");
	return { beats: [{ steps: allSteps }] };
}
