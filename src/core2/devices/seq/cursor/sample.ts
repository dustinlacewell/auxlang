/**
 * Get output for current sample from cursor.
 *
 * O(1) per sample - scans forward through pre-sorted event list.
 */

import type { Cursor, CursorOutput } from "./types";

/**
 * Get sequencer output for current sample.
 *
 * @param cursor - Cursor state (mutated: eventIndex, cv, lastTriggeredPath)
 * @param phase - Phase within current beat (0-1)
 * @param isNewBeat - True if this is the first sample of a new beat
 */
export function sampleCursor(cursor: Cursor, phase: number, isNewBeat: boolean): CursorOutput {
	const events = cursor.events;

	// No events this beat - output silence
	if (events.length === 0) {
		return { cv: cursor.lastCV, gate: 0, trig: 0 };
	}

	// Advance eventIndex if phase crossed into a new event
	// Events are sorted by start, so we scan forward
	while (cursor.eventIndex < events.length - 1) {
		const next = events[cursor.eventIndex + 1]!;
		if (phase >= next.start) {
			cursor.eventIndex++;
		} else {
			break;
		}
	}

	const event = events[cursor.eventIndex]!;

	// Update CV
	cursor.cv = event.freq;
	cursor.lastCV = event.freq;

	// Gate: on while phase is within event's range (with small gap for retrigger)
	const gateEnd = event.end - 0.001;
	const gate = phase >= event.start && phase < gateEnd ? 1 : 0;

	// Trigger: 1 on first sample of this event
	let trig = 0;
	if (event.pathKey !== cursor.lastTriggeredPath) {
		trig = 1;
		cursor.lastTriggeredPath = event.pathKey;
	}

	return { cv: cursor.cv, gate, trig };
}
