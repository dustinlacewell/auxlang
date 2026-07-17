/** Shared test helpers: querying windows and comparing event sets exactly. */

import type { Pat } from "@/core3/pattern/ast";
import type { Ev } from "@/core3/pattern/event";
import { isOnset } from "@/core3/pattern/event";
import { query } from "@/core3/pattern/query";
import type { R } from "@/core3/pattern/rational";
import { r } from "@/core3/pattern/rational";

export function queryCycles(pat: Pat, from: number, to: number, seed = 0): Ev[] {
	return query(pat, { begin: r(from), end: r(to) }, { seed, path: 0 });
}

const rk = (x: R): string => `${x.n}/${x.d}`;

/** Canonical string for an event — exact rationals, whole+part+value+ties. */
export function evKey(ev: Ev): string {
	const whole = ev.whole ? `${rk(ev.whole.begin)}..${rk(ev.whole.end)}` : "~";
	const part = `${rk(ev.part.begin)}..${rk(ev.part.end)}`;
	const ties = `${ev.tieNext ? "N" : ""}${ev.tiePrev ? "P" : ""}`;
	return `${whole}|${part}|${ev.value}|${ties}`;
}

/** Order-independent canonical form of an event list. */
export function evSet(evs: readonly Ev[]): string[] {
	return evs.map(evKey).sort();
}

export function onsets(evs: readonly Ev[]): Ev[] {
	return evs.filter(isOnset);
}

/** Onset begin positions as "n/d" strings, in part order. */
export function onsetKeys(evs: readonly Ev[]): string[] {
	return onsets(evs).map((ev) => rk(ev.part.begin));
}
