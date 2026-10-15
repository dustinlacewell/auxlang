/**
 * History for `stable` and `rr` voices. A cycle's lanes depend on every cycle
 * before it, so they are a fold over the child from cycle 0. The fold is exact
 * and pure: cycle c's lanes never depend on which cycles were read before.
 * The cache only saves work:
 *
 *   checkpoints  the state at the start of every CHECKPOINT_CYCLES-th cycle.
 *                Past MAX_CHECKPOINTS, every other one is dropped and the
 *                spacing doubles. Every checkpoint is exact, so dropping one
 *                costs replay time, never correctness.
 *   cursor       the state where the last replay stopped, so play that moves
 *                forward folds one new cycle at a time.
 *   recent       the lanes of the last RECENT_CYCLES cycles read (a table
 *                refill reads the next cycle; its carry looks back a period).
 *
 * A read at cycle c replays from the nearest kept state at or before c:
 * O(c - that cycle).
 */

import type { Ev } from "../event";
import type { Assigned } from "./assign-cycle";
import type { VoiceState } from "./voice-state";

/** Cycles between checkpoints, before any thinning. */
export const CHECKPOINT_CYCLES = 32;
/** Checkpoints kept per history: 1024 × 32 cycles ≈ 18 hours at 120 bpm before the first thinning. */
export const MAX_CHECKPOINTS = 1024;
/** Cycles of lanes kept for repeat reads. */
export const RECENT_CYCLES = 64;

/** Fold one cycle: the lanes as it begins → its events with lanes, and the lanes as it ends. */
export type FoldCycle = (state: VoiceState, cycle: number) => Assigned;

export interface History {
	readonly checkpoints: Map<number, VoiceState>;
	/** Checkpoint spacing now: CHECKPOINT_CYCLES doubled once per thinning. */
	stride: number;
	cursor: { readonly cycle: number; readonly state: VoiceState };
	readonly recent: Map<number, readonly Ev[]>;
}

/** A history whose cycle 0 begins in `start`. */
export function createHistory(start: VoiceState): History {
	return {
		checkpoints: new Map([[0, start]]),
		stride: CHECKPOINT_CYCLES,
		cursor: { cycle: 0, state: start },
		recent: new Map(),
	};
}

/** Cycle `c`'s events with their lanes (c >= 0). */
export function historyCycle(h: History, c: number, fold: FoldCycle): readonly Ev[] {
	const hit = h.recent.get(c);
	if (hit !== undefined) return remember(h, c, hit);
	let { cycle, state } = nearestBefore(h, c);
	let events: readonly Ev[] = [];
	for (; cycle <= c; cycle++) {
		if (cycle % h.stride === 0) keepCheckpoint(h, cycle, state);
		const next = fold(state, cycle);
		events = remember(h, cycle, next.events);
		state = next.state;
	}
	h.cursor = { cycle, state };
	return events;
}

/** The kept state nearest at or before cycle `c`: the cursor or a checkpoint. */
function nearestBefore(h: History, c: number): { cycle: number; state: VoiceState } {
	let k = Math.floor(c / CHECKPOINT_CYCLES) * CHECKPOINT_CYCLES;
	if (h.cursor.cycle <= c && h.cursor.cycle >= k) return h.cursor;
	while (!h.checkpoints.has(k)) k -= CHECKPOINT_CYCLES;
	const checkpoint = { cycle: k, state: h.checkpoints.get(k) as VoiceState };
	return h.cursor.cycle <= c && h.cursor.cycle > k ? h.cursor : checkpoint;
}

function keepCheckpoint(h: History, cycle: number, state: VoiceState): void {
	h.checkpoints.set(cycle, state);
	if (h.checkpoints.size <= MAX_CHECKPOINTS) return;
	h.stride *= 2;
	for (const k of h.checkpoints.keys()) if (k % h.stride !== 0) h.checkpoints.delete(k);
}

/** Keep `events` as cycle `c`'s, newest last; the oldest goes past RECENT_CYCLES. */
function remember(h: History, c: number, events: readonly Ev[]): readonly Ev[] {
	h.recent.delete(c);
	h.recent.set(c, events);
	if (h.recent.size > RECENT_CYCLES) h.recent.delete(h.recent.keys().next().value as number);
	return events;
}
