/**
 * Get output for current sample from cursor.
 *
 * This is O(1) - no tree traversal, just reads cached state.
 */

import type { Cursor, CursorOutput } from "./types";

/**
 * Get sequencer output for current sample.
 *
 * @param cursor - Cursor state
 * @param phase - Phase within current beat (0-1)
 * @param isNewBeat - True if this is the first sample of a new beat
 */
export function sampleCursor(cursor: Cursor, phase: number, isNewBeat: boolean): CursorOutput {
	// CV is always the cached value (sample-and-hold)
	const cv = cursor.cv;

	// Gate: on if we have a note, off near end for retrigger gap
	let gate = 0;
	if (cursor.gateOn) {
		// Calculate phase within the note's duration
		const notePhase = phase; // Already 0-1 within beat
		const gateEnd = cursor.noteDuration - 0.001;
		gate = notePhase < gateEnd ? 1 : 0;
	}

	// Trigger: 1 on first sample of a new note
	const trig = isNewBeat && cursor.gateOn ? 1 : 0;

	return { cv, gate, trig };
}
