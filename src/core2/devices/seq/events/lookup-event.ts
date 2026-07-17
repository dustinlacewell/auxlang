/**
 * Event lookup for phase-based sequencer.
 */

import type { SeqEvent } from "./types";

/**
 * Find the event at a given position.
 *
 * @param events - Sorted array of events
 * @param position - Position within pattern [0, totalBeats)
 * @returns The event at the position, or null if none
 */
export function lookupEvent(
	events: SeqEvent[],
	position: number,
): SeqEvent | null {
	if (events.length === 0) return null;

	// Binary search for the event containing this position
	let low = 0;
	let high = events.length - 1;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const event = events[mid]!;

		if (position < event.start) {
			high = mid - 1;
		} else if (position >= event.end) {
			low = mid + 1;
		} else {
			// position >= event.start && position < event.end
			return event;
		}
	}

	// No event found at this position (could be in a gap from rests being filtered)
	return null;
}

/**
 * Find the event index at a given position.
 *
 * @param events - Sorted array of events
 * @param position - Position within pattern [0, totalBeats)
 * @returns The event index, or -1 if none
 */
export function lookupEventIndex(
	events: SeqEvent[],
	position: number,
): number {
	if (events.length === 0) return -1;

	// Binary search for the event containing this position
	let low = 0;
	let high = events.length - 1;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const event = events[mid]!;

		if (position < event.start) {
			high = mid - 1;
		} else if (position >= event.end) {
			low = mid + 1;
		} else {
			return mid;
		}
	}

	return -1;
}
