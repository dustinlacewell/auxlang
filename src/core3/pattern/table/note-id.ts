/**
 * Note identity of an event row: the onset of the event's own note, in
 * absolute beats. A tie continues the note before it, so it takes
 * `prevNoteId`. An event with no whole (a continuous signal) is its own note
 * from where its part begins.
 */

import type { Ev } from "../event";
import { rtof } from "../rational";
import { KIND_NOTE, KIND_TIE } from "./event-table";

export function noteIdOf(ev: Ev, prevNoteId: number): number {
	if (ev.tiePrev === true) return prevNoteId;
	return rtof((ev.whole ?? ev.part).begin);
}

export function kindOf(ev: Ev): number {
	return ev.tiePrev === true ? KIND_TIE : KIND_NOTE;
}
