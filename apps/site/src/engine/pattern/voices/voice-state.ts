/**
 * What `stable` and `rr` voices carry from one cycle to the next: the voice
 * each lane holds, the notes rr cut off, and how many notes have begun. States
 * are immutable, because the history keeps them as checkpoints.
 */

import type { Ev, Span } from "../event";
import { laneOf } from "../event";
import type { R } from "../rational";

/** A lane's latest event (note, slide or tie). It stays after it ends, so a later note can find it. */
export interface Voice {
	/** The child's lane it comes from: ties and slides in that lane continue it. */
	readonly from: number;
	/** The value it sounds. A tie keeps its note's value. */
	readonly value: number;
	/** The onset of the note it sounds (the table's note id). A tie keeps its note's. */
	readonly note: R;
	/** The latest event's whole as it plays: later fragments match `begin`; the lane is free from `end`. */
	readonly begin: R;
	readonly end: R;
	/** The lane's held record fields: each from the latest note that carried it. */
	readonly fields?: Readonly<Record<string, number>>;
}

/** A note cut off before its whole ends: its later fragments do not sound. */
export interface Cut {
	readonly from: number;
	readonly begin: R;
	readonly end: R;
}

export interface VoiceState {
	readonly lanes: readonly (Voice | null)[];
	/** Notes cut off that would still ring past the state's cycle. */
	readonly cut: readonly Cut[];
	/** Note onsets so far: rr's turn counter. */
	readonly onsets: number;
}

export const emptyState = (n: number): VoiceState => ({
	lanes: Array.from({ length: n }, () => null),
	cut: [],
	onsets: 0,
});

/** The voice a note or slide starts in a lane that held `prev`: it keeps the fields the note does not carry. */
export function noteVoice(ev: Ev, whole: Span, prev: Voice | null | undefined): Voice {
	const voice = { from: laneOf(ev), value: ev.value, note: whole.begin, begin: whole.begin, end: whole.end };
	if (ev.fields === undefined && prev?.fields === undefined) return voice;
	return { ...voice, fields: { ...prev?.fields, ...ev.fields } };
}

/** The voice a tie continues, now reaching to the tie's end. */
export function tieVoice(held: Voice, ev: Ev, whole: Span): Voice {
	return { ...held, from: laneOf(ev), begin: whole.begin, end: whole.end };
}
