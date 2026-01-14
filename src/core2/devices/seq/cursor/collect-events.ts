/**
 * Collect all note events within a beat, flattened from nested structure.
 *
 * Called once per beat boundary to build the event schedule.
 * Returns events sorted by start time for sample-perfect lookup.
 */

import type { Expr } from "../expr/types";
import { countBeats } from "../expr/count-beats";
import { pitchToFreq } from "../expr/pitch-to-freq";
import type { BeatEvent } from "./types";
import { traverseExpr, type ExprVisitor, type TraversalState } from "../expr/generic-traverse";

/**
 * Context for event collection visitor.
 */
interface EventCollectionContext {
	beatIndex: number;
	events: BeatEvent[];
}

/**
 * Visitor that collects events overlapping with a target beat.
 */
class EventCollector implements ExprVisitor<EventCollectionContext> {
	visitNote(
		expr: Expr & { type: "note" },
		beatStart: number,
		duration: number,
		inTie: boolean,
		context: EventCollectionContext,
	): void {
		const beatEnd = beatStart + duration;
		const beatRangeStart = context.beatIndex;
		const beatRangeEnd = context.beatIndex + 1;

		// Check if this note overlaps with the target beat
		if (beatEnd <= beatRangeStart || beatStart >= beatRangeEnd) {
			return;
		}

		// Normalize to 0-1 within the beat
		const start = Math.max(0, beatStart - context.beatIndex);
		const end = Math.min(1, beatEnd - context.beatIndex);

		context.events.push({
			freq: pitchToFreq(expr.pitch),
			start,
			end,
			isTrigger: !inTie,
		});
	}

	visitRest(_expr: Expr & { type: "rest" }, _beatStart: number, _duration: number, _context: EventCollectionContext): void {
		// Rests produce no events
	}
}

/**
 * Collect all events within a beat range.
 *
 * @param expr - The expression to search
 * @param beatIndex - Which beat we're collecting for (0-indexed)
 * @param state - Traversal state (prob decisions, alt positions)
 * @param cycle - Current cycle (for alternation)
 * @returns Array of events sorted by start time
 */
export function collectBeatEvents(
	expr: Expr,
	beatIndex: number,
	state: TraversalState,
	cycle: number,
): BeatEvent[] {
	const totalBeats = countBeats(expr);
	const events: BeatEvent[] = [];
	const context: EventCollectionContext = { beatIndex, events };

	const visitor = new EventCollector();
	traverseExpr(expr, 0, totalBeats, cycle, state, false, "root", visitor, context);

	// Sort by start time for efficient lookup
	events.sort((a, b) => a.start - b.start);

	return events;
}
