/**
 * Build event list from AST for phase-based sequencer.
 *
 * Collects all events for the entire pattern with positions in beat units.
 */

import type { Expr } from "../ast/types";
import { countBeats } from "../traverse/count-beats";
import { pitchToFreq } from "../pitch/pitch-to-freq";
import { traverseExpr } from "../traverse/traverse";
import type { ExprVisitor, TraversalState } from "../traverse/types";
import type { SeqEvent } from "./types";

/**
 * Context for event collection visitor.
 */
interface BuildContext {
	events: SeqEvent[];
}

/**
 * Visitor that collects all events in beat units.
 */
class EventBuilder implements ExprVisitor<BuildContext> {
	visitNote(
		expr: Expr & { type: "note" },
		beatStart: number,
		duration: number,
		inTie: boolean,
		context: BuildContext,
	): void {
		const event: SeqEvent = {
			freq: pitchToFreq(expr.pitch),
			start: beatStart,
			end: beatStart + duration,
			isRest: false,
			isTiedFromPrevious: inTie,
			isTiedToNext: false, // Will be set in post-processing
		};
		if (expr.srcStart !== undefined) event.srcStart = expr.srcStart;
		if (expr.srcEnd !== undefined) event.srcEnd = expr.srcEnd;
		context.events.push(event);
	}

	visitRest(
		expr: Expr & { type: "rest" },
		beatStart: number,
		duration: number,
		context: BuildContext,
	): void {
		const event: SeqEvent = {
			freq: 0,
			start: beatStart,
			end: beatStart + duration,
			isRest: true,
			isTiedFromPrevious: false,
			isTiedToNext: false,
		};
		if (expr.srcStart !== undefined) event.srcStart = expr.srcStart;
		if (expr.srcEnd !== undefined) event.srcEnd = expr.srcEnd;
		context.events.push(event);
	}
}

/**
 * Build all events for a pattern.
 *
 * @param expr - The pattern AST
 * @param state - Traversal state (prob decisions, alt positions)
 * @param cycle - Current cycle (for alternation/probability)
 * @returns Array of events sorted by start time, with tie flags set
 */
export function buildEvents(
	expr: Expr,
	state: TraversalState,
	cycle: number,
): SeqEvent[] {
	const totalBeats = countBeats(expr);
	const context: BuildContext = { events: [] };

	const visitor = new EventBuilder();
	traverseExpr(expr, 0, totalBeats, cycle, state, false, "root", visitor, context);

	const events = context.events;

	// Sort by start time
	events.sort((a, b) => a.start - b.start);

	// Post-process: set isTiedToNext based on next event's isTiedFromPrevious
	for (let i = 0; i < events.length - 1; i++) {
		const current = events[i]!;
		const next = events[i + 1]!;
		// If next event is tied from previous and they're adjacent, current is tied to next
		if (next.isTiedFromPrevious && Math.abs(current.end - next.start) < 0.0001) {
			current.isTiedToNext = true;
		}
	}

	return events;
}
