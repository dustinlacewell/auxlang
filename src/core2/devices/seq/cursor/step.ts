/**
 * Step the cursor to a new beat.
 *
 * Called once per beat change, not per sample.
 */

import type { Expr } from "../expr/types";
import { countBeats } from "../expr/traverse";
import type { Cursor } from "./types";
import { findNoteAtBeat } from "./find-note";

/**
 * Step cursor to a new beat position.
 *
 * @param cursor - Current cursor state (mutated in place)
 * @param expr - Pattern expression
 * @param beatIndex - New beat index
 * @param cycle - Current cycle
 */
export function stepCursor(cursor: Cursor, expr: Expr, beatIndex: number, cycle: number): void {
	const totalBeats = countBeats(expr);

	// Check if cycle changed - clear probability decisions
	if (cycle !== cursor.cycle) {
		// Clear by reassigning (plain object, not Map)
		for (const key in cursor.probDecisions) {
			delete cursor.probDecisions[key];
		}
		cursor.cycle = cycle;
	}

	cursor.beatIndex = beatIndex;

	// Find the note at this beat
	const note = findNoteAtBeat(expr, beatIndex, 0, totalBeats, "root", cursor.probDecisions, cycle);

	if (note) {
		cursor.cv = note.freq;
		cursor.lastCV = note.freq;
		cursor.gateOn = true;
		cursor.noteDuration = note.duration;
		cursor.noteStartBeat = note.beatStart;
	} else {
		// Rest or probability skip - gate off, keep last CV
		cursor.cv = cursor.lastCV;
		cursor.gateOn = false;
		cursor.noteDuration = 0;
		cursor.noteStartBeat = -1;
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
