/**
 * Before cycle 0 there is no history, so `stable` and `rr` use the packed
 * lanes there: each event keeps its child lane, wrapped into the n lanes (rr's
 * n may be below the structural width). Rests take no lane, as from cycle 0 on.
 *
 * History starts empty at cycle 0, with one exception: a note or tie that
 * crosses into cycle 0 (seen when a pattern is read before 0) keeps its packed
 * lane. A voice that ends at 0 is no history: cycle 0 holds no common tone
 * with it, and a tie at 0 has no note to continue.
 */

import type { Ev } from "../event";
import { laneOf } from "../event";
import { R0, rcmp, rlt } from "../rational";
import { discreteWhole } from "./discrete-whole";
import { type Voice, type VoiceState, emptyState, noteVoice, tieVoice } from "./voice-state";

export function packedLanes(evs: readonly Ev[], n: number): Ev[] {
	return evs.filter((ev) => ev.kind !== "rest").map((ev) => ({ ...ev, lane: laneOf(ev) % n }));
}

/** The lanes as cycle 0 begins: the voices of cycle -1's packed lanes still sounding at 0. */
export function seedState(cycleBefore: readonly Ev[], n: number): VoiceState {
	const lanes: (Voice | null)[] = [...emptyState(n).lanes];
	const evs = cycleBefore.filter((ev) => ev.kind !== "rest").sort((a, b) => rcmp(a.part.begin, b.part.begin));
	for (const ev of evs) {
		const lane = laneOf(ev) % n;
		const held = lanes[lane];
		const whole = discreteWhole(ev);
		if (ev.kind !== "tie") lanes[lane] = noteVoice(ev, whole);
		else if (held) lanes[lane] = tieVoice(held, ev, whole);
	}
	return { ...emptyState(n), lanes: lanes.map((v) => (v !== null && rlt(R0, v.end) ? v : null)) };
}
