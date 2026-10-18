/**
 * rowKind — what an event becomes as a table row, given the note in force
 * just before it (NO_NOTE after a rest or a gap):
 *
 *   rest   a rest row, no note
 *   note   its own note
 *   tie    continues the note in force; after a rest there is no note to
 *          continue, so it is a rest
 *   slide  its own note, sliding from the note in force; after a rest there is
 *          nothing to slide from, so it is a note
 */

import type { Ev } from "../event";
import { KIND_NOTE, KIND_REST, KIND_SLIDE, KIND_TIE, NO_NOTE } from "./event-table";
import { ownNoteId } from "./note-id";

export interface RowKind {
	readonly kind: number;
	readonly noteId: number;
	readonly slideFrom: number;
}

const REST_ROW: RowKind = { kind: KIND_REST, noteId: NO_NOTE, slideFrom: NO_NOTE };

export function rowKind(ev: Ev, inForce: number): RowKind {
	switch (ev.kind) {
		case "rest":
			return REST_ROW;
		case "tie":
			return inForce === NO_NOTE ? REST_ROW : { kind: KIND_TIE, noteId: inForce, slideFrom: NO_NOTE };
		case "slide":
			return inForce === NO_NOTE
				? { kind: KIND_NOTE, noteId: ownNoteId(ev), slideFrom: NO_NOTE }
				: { kind: KIND_SLIDE, noteId: ownNoteId(ev), slideFrom: inForce };
		case "note":
			return { kind: KIND_NOTE, noteId: ownNoteId(ev), slideFrom: NO_NOTE };
	}
}

/** The row sets a new held value: a note or a slide. */
export const setsValue = (row: RowKind): boolean => row.kind === KIND_NOTE || row.kind === KIND_SLIDE;
