/**
 * Create a new cursor positioned at beat 0.
 */

import type { Expr } from "../expr/types";
import { countBeats } from "../expr/traverse";
import type { Cursor } from "./types";
import { findNoteAtBeat } from "./find-note";

/**
 * Create a cursor initialized to beat 0, cycle 0.
 */
export function createCursor(expr: Expr): Cursor {
	const totalBeats = countBeats(expr);

	const cursor: Cursor = {
		path: [],
		beatIndex: 0,
		cycle: 0,
		cv: 0,
		gateOn: false,
		noteDuration: 0,
		noteStartBeat: -1,
		probDecisions: {},
		lastCV: 0,
	};

	// Find the note at beat 0
	const note = findNoteAtBeat(expr, 0, 0, totalBeats, "root", cursor.probDecisions, 0);
	if (note) {
		cursor.cv = note.freq;
		cursor.lastCV = note.freq;
		cursor.gateOn = true;
		cursor.noteDuration = note.duration;
		cursor.noteStartBeat = 0;
	}

	return cursor;
}
