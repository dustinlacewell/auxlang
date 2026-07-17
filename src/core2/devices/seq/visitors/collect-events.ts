/**
 * Collect events at a specific beat position.
 *
 * Provides a beat-based query interface on top of the event builder.
 */

import type { Expr } from "../ast/types";
import type { TraversalState } from "../traverse/types";
import { buildEvents } from "../events/build-events";
import type { SeqEvent } from "../events/types";

/**
 * Collect events that occur at a specific beat position.
 *
 * @param expr - The pattern AST
 * @param beat - Beat position to query (can be fractional for sub-beats)
 * @param state - Traversal state (prob decisions, alt positions)
 * @param cycle - Current cycle (for alternation/probability)
 * @returns Events that are active at the given beat
 */
export function collectBeatEvents(
	expr: Expr,
	beat: number,
	state: TraversalState,
	cycle: number,
): SeqEvent[] {
	const allEvents = buildEvents(expr, state, cycle);

	// Filter to events that contain this beat position
	// An event contains the beat if: beat >= start && beat < end
	return allEvents.filter((e) => beat >= e.start && beat < e.end);
}
