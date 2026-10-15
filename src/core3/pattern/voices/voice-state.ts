/**
 * What `stable` and `rr` voices carry from one cycle to the next: the voice
 * each lane holds and how many notes have begun. States are immutable, because
 * the history keeps them as checkpoints.
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
	/** The latest event's whole: later fragments match `begin`; the lane is free from `end`. */
	readonly begin: R;
	readonly end: R;
}

export interface VoiceState {
	readonly lanes: readonly (Voice | null)[];
	/** Note onsets so far: rr's turn counter. */
	readonly onsets: number;
}

export const emptyState = (n: number): VoiceState => ({
	lanes: Array.from({ length: n }, () => null),
	onsets: 0,
});

/** The voice an event starts or continues, holding `value`. */
export function voiceOf(ev: Ev, whole: Span, value: number): Voice {
	return { from: laneOf(ev), value, begin: whole.begin, end: whole.end };
}
