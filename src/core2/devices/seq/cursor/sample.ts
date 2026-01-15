/**
 * Get output for current sample from cursor.
 *
 * O(1) per sample - scans forward through pre-sorted event list.
 * Uses sample-perfect trigger detection based on event boundaries.
 * Updates activeEventIndex for visualization (seq reads it directly).
 */

import type { Cursor, CursorOutput } from "./types";

/**
 * Get sequencer output for current sample.
 *
 * @param cursor - Cursor state (mutated: eventIndex, cv, lastTriggeredSample, activeEventIndex)
 * @param sampleIndex - Sample index within current beat (0 to samplesPerBeat-1)
 * @param samplesPerBeat - Total samples in one beat
 */
export function sampleCursor(cursor: Cursor, sampleIndex: number, samplesPerBeat: number): CursorOutput {
	const events = cursor.events;

	// No events this beat - output silence
	if (events.length === 0) {
		cursor.activeEventIndex = -1;
		return { cv: cursor.lastCV, gate: 0, trig: 0 };
	}

	// Advance eventIndex to the event containing (or just before) sampleIndex
	while (cursor.eventIndex < events.length - 1) {
		const next = events[cursor.eventIndex + 1]!;
		const nextStartSample = Math.floor(next.start * samplesPerBeat);
		if (sampleIndex >= nextStartSample) {
			cursor.eventIndex++;
		} else {
			break;
		}
	}

	const event = events[cursor.eventIndex]!;
	const eventStartSample = Math.floor(event.start * samplesPerBeat);
	const eventEndSample = Math.floor(event.end * samplesPerBeat);

	// Track whether we're inside an event or in a gap (for visualization)
	const insideEvent = sampleIndex >= eventStartSample && sampleIndex < eventEndSample;
	cursor.activeEventIndex = insideEvent ? cursor.eventIndex : -1;

	// Update CV
	cursor.cv = event.freq;
	cursor.lastCV = event.freq;

	// Gate: on while sampleIndex is within event's range (with 1 sample gap for retrigger)
	const gate = sampleIndex >= eventStartSample && sampleIndex < eventEndSample - 1 ? 1 : 0;

	// Trigger: fires on exact sample when event starts, if this event should trigger
	let trig = 0;
	if (event.isTrigger && sampleIndex === eventStartSample && cursor.lastTriggeredSample !== eventStartSample) {
		trig = 1;
		cursor.lastTriggeredSample = eventStartSample;
	}

	return { cv: cursor.cv, gate, trig };
}
