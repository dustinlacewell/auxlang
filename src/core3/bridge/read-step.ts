/**
 * Reading one sample of a pattern at a position (MANIFESTO §4.1), on plain
 * numbers: the row under the position (its kind, note id, and the note a
 * slide comes from) and the reader's previous note id, gate, and dip
 * countdown. Pure; allocates nothing.
 *
 *   trig   fires when the position enters a different note, from any
 *          direction and any distance; a tie belongs to its note. A slide
 *          entered straight from the note it slides from fires nothing.
 *   gate   high inside a note, a slide, or their ties, with a 1 ms dip
 *          between touching notes. A clocked reader dips in the window before
 *          the row ends, so gate and trig rise together. An unclocked reader
 *          dips from the change, when a trig lands while the gate is high.
 *   slide  high inside a slide.
 */

import { KIND_REST, KIND_SLIDE, NO_NOTE } from "../pattern/table/event-table";

/** The gate dip's length. */
export const DIP_SECONDS = 0.001;

export function trigOf(kind: number, noteId: number, slideFrom: number, prevNoteId: number): number {
	if (kind === KIND_REST || noteId === prevNoteId) return 0;
	return kind === KIND_SLIDE && slideFrom === prevNoteId ? 0 : 1;
}

export const slideOf = (kind: number): number => (kind === KIND_SLIDE ? 1 : 0);

/** The note id the reader remembers: none (NO_NOTE) inside a rest. */
export function heldNoteId(kind: number, noteId: number): number {
	return kind === KIND_REST ? NO_NOTE : noteId;
}

/** Unclocked dip countdown in samples: restarts on a trig into a high gate, else counts down. */
export function dipLeftAfter(
	trig: number,
	gateWas: number,
	dipLeft: number,
	dipSamples: number,
): number {
	if (trig === 1 && gateWas === 1) return dipSamples;
	return dipLeft > 0 ? dipLeft - 1 : 0;
}

/** Clocked dip: the last `dipBeats` of a row marked to dip before the next note. */
export function inDipWindow(pos: number, end: number, dipBefore: number, dipBeats: number): number {
	return dipBefore === 1 && pos >= end - dipBeats ? 1 : 0;
}

export function gateOf(kind: number, dipLeft: number, dipWindow: number): number {
	return kind !== KIND_REST && dipLeft === 0 && dipWindow === 0 ? 1 : 0;
}

export function dipSamplesAt(sampleRate: number): number {
	return Math.round(DIP_SECONDS * sampleRate);
}

/** The dip's length in position units, from the position's per-sample step (0 before a first step). */
export function dipBeatsAt(started: number, step: number, sampleRate: number): number {
	return started === 1 && step > 0 ? DIP_SECONDS * sampleRate * step : 0;
}
