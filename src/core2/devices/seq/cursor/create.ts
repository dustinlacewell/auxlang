/**
 * Create a new cursor positioned at beat 0.
 */

import type { Expr } from "../expr/types";
import type { Cursor } from "./types";
import { collectBeatEvents } from "./collect-events";

/**
 * Create a cursor initialized to beat 0, cycle 0.
 */
export function createCursor(expr: Expr): Cursor {
	const probDecisions: Record<string, boolean> = {};
	const events = collectBeatEvents(expr, 0, probDecisions, 0);

	const cursor: Cursor = {
		path: [],
		beatIndex: 0,
		cycle: 0,
		cv: 0,
		gateOn: events.length > 0,
		noteDuration: 0,
		noteStartBeat: -1,
		probDecisions,
		lastCV: 0,
		events,
		eventIndex: 0,
		lastTriggeredSample: -1,
	};

	// Set initial CV from first event
	if (events.length > 0) {
		cursor.cv = events[0]!.freq;
		cursor.lastCV = events[0]!.freq;
	}

	return cursor;
}
