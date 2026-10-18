/**
 * One cycle of `stable` or `rr` voices: fold the child's events for cycle `c`
 * into lanes, from the lanes as the cycle begins. Lanes follow the events as
 * they play:
 *
 * - Rests take no lane. An empty stretch of a lane reads as a rest.
 * - A fragment of an earlier note keeps that note's lane. A fragment of a
 *   note rr cut off does not sound. A fragment whose onset never played (an
 *   `every` or `<>` switch at the cycle edge) is a note entering where the
 *   fragment starts, as packed lanes play it.
 * - A voice whose note does not go on into this cycle (a switch dropped it)
 *   ended at the cycle start, so it holds its lane no longer.
 * - A tie or a slide continues the voice of its child lane that ends where it
 *   begins. With no such voice, a tie is a rest (dropped) and a slide is a
 *   new note.
 * - New notes that begin together get their lanes from `place`: the policy.
 *   A note placed in a lane whose voice still sounds steals it: the old note
 *   stops at the steal, and none of its later fragments sound.
 */

import type { Ev, Span } from "../event";
import { laneOf, startsHere } from "../event";
import { type R, r, rcmp, req, rlt, rmin } from "../rational";
import { discreteWhole } from "./discrete-whole";
import { type Cut, type Voice, type VoiceState, noteVoice, tieVoice } from "./voice-state";

/** Lanes for the notes that begin together at `t`, in order. `onsets` counts the notes begun before them. */
export type Place = (lanes: readonly (Voice | null)[], notes: readonly Ev[], t: R, onsets: number) => number[];

export interface Assigned {
	readonly state: VoiceState;
	readonly events: readonly Ev[];
}

/** The fold's working copy of a state, for one cycle. */
interface Fold {
	readonly lanes: (Voice | null)[];
	readonly cut: Cut[];
	readonly out: Ev[];
}

export function assignCycle(state: VoiceState, evs: readonly Ev[], c: number, place: Place): Assigned {
	const start = r(c);
	const f: Fold = { lanes: [...state.lanes], cut: state.cut.filter((x) => rlt(start, x.end)), out: [] };
	const entering = carryOver(f, evs, start);
	let onsets = state.onsets;
	for (const group of byOnset(evs, entering)) {
		const fresh = continueVoices(f, group);
		placeNotes(f, fresh, place(f.lanes, fresh, group.t, onsets), group.t);
		onsets += fresh.length;
	}
	return { state: { lanes: f.lanes, cut: f.cut, onsets }, events: f.out };
}

const withLane = (ev: Ev, lane: number): Ev => (laneOf(ev) === lane ? ev : { ...ev, lane });

const sameNote = (x: { from: number; begin: R }, ev: Ev, begin: R): boolean =>
	x.from === laneOf(ev) && req(x.begin, begin);

/**
 * Fragments of notes begun before the cycle keep their voice's lane; those of
 * cut notes and of ties with no voice are dropped. Voices that do not go on
 * end at the cycle start. Returns the fragments that enter as new notes.
 */
function carryOver(f: Fold, evs: readonly Ev[], start: R): Ev[] {
	const goesOn = new Set<number>();
	const entering: Ev[] = [];
	for (const ev of evs) {
		if (ev.kind === "rest" || startsHere(ev)) continue;
		const begin = discreteWhole(ev).begin;
		const lane = f.lanes.findIndex((v) => v !== null && sameNote(v, ev, begin));
		if (lane >= 0) {
			goesOn.add(lane);
			f.out.push(withLane(ev, lane));
		} else if (ev.kind !== "tie" && !f.cut.some((x) => sameNote(x, ev, begin))) {
			entering.push(ev.kind === "slide" ? { ...ev, kind: "note" } : ev);
		}
	}
	f.lanes.forEach((v, i) => {
		if (v !== null && !goesOn.has(i) && rlt(start, v.end)) f.lanes[i] = { ...v, end: start };
	});
	return entering;
}

interface Group {
	readonly t: R;
	readonly evs: readonly Ev[];
}

/** When an event starts to play: its onset, or where an entering fragment starts. */
const playsFrom = (ev: Ev): R => (startsHere(ev) ? discreteWhole(ev).begin : ev.part.begin);

/** The cycle's onsets (rests left out) and entering fragments, grouped by start, each group in child-lane order. */
function byOnset(evs: readonly Ev[], entering: readonly Ev[]): Group[] {
	const starts = [...evs.filter((ev) => ev.kind !== "rest" && startsHere(ev)), ...entering].sort(
		(a, b) => rcmp(playsFrom(a), playsFrom(b)) || laneOf(a) - laneOf(b),
	);
	const groups: { t: R; evs: Ev[] }[] = [];
	for (const ev of starts) {
		const t = playsFrom(ev);
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
function continueVoices(f: Fold, group: Group): Ev[] {
	const fresh: Ev[] = [];
	for (const ev of group.evs) {
		if (ev.kind === "note" || !startsHere(ev)) {
			fresh.push(ev);
			continue;
		}
		const lane = f.lanes.findIndex((v) => v !== null && v.from === laneOf(ev) && req(v.end, group.t));
		if (lane < 0) {
			if (ev.kind === "slide") fresh.push({ ...ev, kind: "note" });
			continue;
		}
		const whole = discreteWhole(ev);
		const held = f.lanes[lane] as Voice;
		f.lanes[lane] = ev.kind === "tie" ? tieVoice(held, ev, whole) : noteVoice(ev, whole, held);
		f.out.push(withLane(ev, lane));
	}
	return fresh;
}

/** Each new note takes its lane, stealing it from a voice that still sounds there. */
function placeNotes(f: Fold, notes: readonly Ev[], at: readonly number[], t: R): void {
	notes.forEach((ev, i) => {
		const lane = at[i] as number;
		steal(f, lane, t);
		f.lanes[lane] = noteVoice(ev, discreteWhole(ev), f.lanes[lane]);
		f.out.push(withLane(ev, lane));
	});
}

/** The voice in `lane`, if it sounds past `t`, stops at `t`: its events are cut there and its later fragments dropped. */
function steal(f: Fold, lane: number, t: R): void {
	const v = f.lanes[lane];
	if (v === null || v === undefined || !rlt(t, v.end)) return;
	f.cut.push({ from: v.from, begin: v.begin, end: v.end });
	for (let i = f.out.length - 1; i >= 0; i--) {
		const ev = f.out[i] as Ev;
		if (laneOf(ev) !== lane || !rlt(t, ev.part.end)) continue;
		if (!rlt(ev.part.begin, t)) f.out.splice(i, 1);
		else f.out[i] = cutAt(ev, t);
	}
}

function cutAt(ev: Ev, t: R): Ev {
	const whole = discreteWhole(ev);
	const cutWhole: Span = { begin: whole.begin, end: rmin(whole.end, t) };
	return { ...ev, whole: cutWhole, part: { begin: ev.part.begin, end: t } };
}
