/**
 * Step the cursor to a new beat.
 *
 * Called once per beat change, not per sample.
 */

import type { Expr } from "../expr/types";
import type { Cursor } from "./types";
import { collectBeatEvents } from "./collect-events";

/**
 * Step cursor to a new beat position.
 *
 * @param cursor - Current cursor state (mutated in place)
 * @param expr - Pattern expression
 * @param beatIndex - New beat index
 * @param cycle - Current cycle
 */
export function stepCursor(cursor: Cursor, expr: Expr, beatIndex: number, cycle: number): void {
	// Check if cycle changed - clear probability decisions
	if (cycle !== cursor.cycle) {
		// Clear by reassigning (plain object, not Map)
		for (const key in cursor.probDecisions) {
			delete cursor.probDecisions[key];
		}
		cursor.cycle = cycle;
	}

	cursor.beatIndex = beatIndex;

	// Collect all events within this beat (flattened from nested structure)
	cursor.events = collectBeatEvents(expr, beatIndex, cursor.probDecisions, cycle);
	cursor.eventIndex = 0;

	// Set initial CV from first event (if any)
	if (cursor.events.length > 0) {
		const first = cursor.events[0]!;
		cursor.cv = first.freq;
		cursor.lastCV = first.freq;
		cursor.gateOn = true;
	} else {
		// No events this beat - rest
		cursor.cv = cursor.lastCV;
		cursor.gateOn = false;
	}
}

/**
 * Reset cursor to initial state (beat 0, cycle 0).
 */
export function resetCursor(cursor: Cursor, expr: Expr): void {
	// Clear by reassigning (plain object, not Map)
	for (const key in cursor.probDecisions) {
		delete cursor.probDecisions[key];
	}
	cursor.cycle = 0;
	stepCursor(cursor, expr, 0, 0);
}
