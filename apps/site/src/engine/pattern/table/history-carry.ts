/**
 * The carry of one lane of a `stable` or `rr` voices node, read from its
 * history. As cycle c begins, the lane's voice holds the value of the lane's
 * most recent note, however long ago it was, and its note is in force when
 * the voice reaches c. A lane with no voice since cycle 0 looks before 0,
 * where lanes are packed: `before0` gives that carry, and also the carry of
 * any cycle at or before 0. The voice's record fields are the lane's held
 * fields (voice-state.ts).
 */

import { r, rlte, rtof } from "../rational";
import { type HistoryRead, voicesStateAt } from "../voices/history-voices";
import type { Voice } from "../voices/voice-state";
import type { Carry } from "./carry-before";
import { NO_NOTE } from "./event-table";

export function historyCarry(
	at: HistoryRead,
	lane: number,
	c: number,
	fieldNames: readonly string[],
	before0: () => Carry,
): Carry {
	if (c <= 0) return before0();
	const voice = voicesStateAt(at, c).lanes[lane];
	if (!voice) {
		const before = before0();
		return { value: before.value, noteId: NO_NOTE, fields: before.fields };
	}
	return {
		value: voice.value,
		noteId: rlte(r(c), voice.end) ? rtof(voice.note) : NO_NOTE,
		fields: voiceFields(voice, fieldNames, before0),
	};
}

/** The voice's held record fields; one it never carried holds what the lane held before 0. */
function voiceFields(voice: Voice, names: readonly string[], before0: () => Carry): number[] {
	let before: Carry | undefined;
	return names.map((name, k) => {
		const held = voice.fields?.[name];
		if (held !== undefined) return held;
		before ??= before0();
		return before.fields[k] as number;
	});
}
