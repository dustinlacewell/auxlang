/**
 * What a lane holds before cycle `c` (MANIFESTO §4.3):
 *
 *   value   the value of the most recent earlier note or slide; rests and
 *           ties have no value of their own, so they are passed over
 *   noteId  the note in force at the end of cycle c - 1: NO_NOTE when that
 *           cycle ends in a rest or a gap; a tie there is followed back to
 *           its note
 *   fields  each record field as `value`: from the most recent earlier note
 *           or slide that carries it
 *
 * Packed lanes, and patterns with no voices, look back a window of cycles
 * (lookback-carry.ts).
 *
 * `stable` and `rr` lanes are not periodic: a lane can stay empty for any
 * number of cycles. Their carry comes from the voices history
 * (history-carry.ts), so it is exact.
 */

import type { Pat } from "../ast";
import { historyRead } from "../query";
import { recordFields } from "../record-fields";
import type { HistoryPolicy } from "../voices/history-voices";
import { historyCarry } from "./history-carry";
import { laneCycle } from "./lane-cycle";
import { type LaneCycles, lookbackCarry } from "./lookback-carry";

export interface Carry {
	readonly value: number;
	readonly noteId: number;
	/** Each record field's held value, in recordFields order. */
	readonly fields: readonly number[];
}

export function carryBefore(
	pat: Pat,
	seed: number,
	lane: number,
	c: number,
	cycles: LaneCycles = (k) => laneCycle(pat, seed, lane, k),
): Carry {
	if (!readsHistory(pat)) return lookbackCarry(pat, cycles, c);
	const history = historyRead(pat, pat.policy, { seed, path: 0 });
	return historyCarry(history, lane, c, recordFields(pat), () =>
		lookbackCarry(pat, cycles, Math.min(c, 0)),
	);
}

type HistoryVoices = Extract<Pat, { op: "voices" }> & { readonly policy: HistoryPolicy };

/** The lane's carry is read from a voices history, not looked back for. */
export const readsHistory = (pat: Pat): pat is HistoryVoices =>
	pat.op === "voices" && pat.policy !== "packed";
