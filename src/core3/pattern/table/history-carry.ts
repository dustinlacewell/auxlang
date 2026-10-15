/**
 * The carry of one lane of a `stable` or `rr` voices node, read from its
 * history. As cycle c begins, the lane's voice holds the value of the lane's
 * most recent note, however long ago it was, and its note is in force when
 * the voice reaches c. A lane with no voice since cycle 0 looks before 0,
 * where lanes are packed: `before0` gives that carry, and also the carry of
 * any cycle at or before 0.
 */

import { r, rlte, rtof } from "../rational";
import { type HistoryRead, voicesStateAt } from "../voices/history-voices";
import type { Carry } from "./carry-before";
import { NO_NOTE } from "./event-table";

export function historyCarry(at: HistoryRead, lane: number, c: number, before0: () => Carry): Carry {
	if (c <= 0) return before0();
	const voice = voicesStateAt(at, c).lanes[lane];
	if (!voice) return { value: before0().value, noteId: NO_NOTE };
	return { value: voice.value, noteId: rlte(r(c), voice.end) ? rtof(voice.note) : NO_NOTE };
}
