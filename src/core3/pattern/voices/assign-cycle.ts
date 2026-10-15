/**
 * One cycle of `stable` or `rr` voices: fold the child's events for the cycle
 * into lanes, from the lanes as the cycle begins.
 *
 * - Rests take no lane. An empty stretch of a lane reads as a rest.
 * - A fragment of an earlier note keeps that note's lane. A fragment whose
 *   note lost its lane (rr cut it off) or never had one is dropped.
 * - A tie or a slide continues the voice of its child lane that ends where it
 *   begins. With no such voice, a tie is dropped (it would read as a rest) and
 *   a slide is a new note.
 * - New notes that begin together get their lanes from `place`: the policy.
 *   When two land in one lane, the later one wins.
 */

import type { Ev } from "../event";
import { laneOf, startsHere } from "../event";
import { type R, rcmp, req } from "../rational";
import { discreteWhole } from "./discrete-whole";
import { type Voice, type VoiceState, voiceOf } from "./voice-state";

/** Lanes for the notes that begin together at `t`, in order. `onsets` counts the notes begun before them. */
export type Place = (lanes: readonly (Voice | null)[], notes: readonly Ev[], t: R, onsets: number) => number[];

export interface Assigned {
	readonly state: VoiceState;
	readonly events: readonly Ev[];
}

export function assignCycle(state: VoiceState, evs: readonly Ev[], place: Place): Assigned {
	const lanes = [...state.lanes];
	const out = carriedOver(lanes, evs);
	let onsets = state.onsets;
	for (const group of startsByTime(evs)) {
		const fresh = continueVoices(lanes, group, out);
		const at = place(lanes, fresh, group.t, onsets);
		placeNotes(lanes, fresh, at, out);
		onsets += fresh.length;
	}
	return { state: { lanes, onsets }, events: out };
}

const withLane = (ev: Ev, lane: number): Ev => (laneOf(ev) === lane ? ev : { ...ev, lane });

/** Fragments of notes begun before: each keeps its voice's lane, or is dropped. */
function carriedOver(lanes: readonly (Voice | null)[], evs: readonly Ev[]): Ev[] {
	const out: Ev[] = [];
	for (const ev of evs) {
		if (ev.kind === "rest" || startsHere(ev)) continue;
		const begin = discreteWhole(ev).begin;
		const lane = lanes.findIndex((v) => v !== null && v.from === laneOf(ev) && req(v.begin, begin));
		if (lane >= 0) out.push(withLane(ev, lane));
	}
	return out;
}

interface Group {
	readonly t: R;
	readonly evs: readonly Ev[];
}

/** Events that begin in this cycle (rests left out), grouped by onset, each group in child-lane order. */
function startsByTime(evs: readonly Ev[]): Group[] {
	const starts = evs
		.filter((ev) => ev.kind !== "rest" && startsHere(ev))
		.sort((a, b) => rcmp(discreteWhole(a).begin, discreteWhole(b).begin) || laneOf(a) - laneOf(b));
	const groups: { t: R; evs: Ev[] }[] = [];
	for (const ev of starts) {
		const t = discreteWhole(ev).begin;
		const last = groups[groups.length - 1];
		if (last !== undefined && req(last.t, t)) last.evs.push(ev);
		else groups.push({ t, evs: [ev] });
	}
	return groups;
}

/**
 * Ties and slides take the lane of the voice they continue. Returns the
 * group's new notes: its notes, plus slides with nothing to slide from.
 */
function continueVoices(lanes: (Voice | null)[], group: Group, out: Ev[]): Ev[] {
	const fresh: Ev[] = [];
	for (const ev of group.evs) {
		if (ev.kind === "note") {
			fresh.push(ev);
			continue;
		}
		const lane = lanes.findIndex((v) => v !== null && v.from === laneOf(ev) && req(v.end, group.t));
		if (lane < 0) {
			if (ev.kind === "slide") fresh.push({ ...ev, kind: "note" });
			continue;
		}
		const held = lanes[lane] as Voice;
		lanes[lane] = voiceOf(ev, discreteWhole(ev), ev.kind === "tie" ? held.value : ev.value);
		out.push(withLane(ev, lane));
	}
	return fresh;
}

/** Each new note takes its lane; of two in one lane, the later one wins. */
function placeNotes(lanes: (Voice | null)[], notes: readonly Ev[], at: readonly number[], out: Ev[]): void {
	const winner = new Map<number, number>();
	at.forEach((lane, i) => winner.set(lane, i));
	notes.forEach((ev, i) => {
		const lane = at[i] as number;
		if (winner.get(lane) !== i) return;
		lanes[lane] = voiceOf(ev, discreteWhole(ev), ev.value);
		out.push(withLane(ev, lane));
	});
}
