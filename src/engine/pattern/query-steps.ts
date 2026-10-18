import type { Pat, RecordField } from "./ast";
import type { Ev, Span } from "./event";
import { laneOf } from "./event";
import { cycleEvent, descend, type QueryCtx, query } from "./query";
import { type R, r, radd, rfloor, rlte } from "./rational";

/** A tie in each lane, so a chord ties in every lane. A tie has no value of its own. */
export function queryTie(lanes: number, span: Span): Ev[] {
	return Array.from({ length: lanes }, (_, lane) =>
		cycleEvent(span, 0, "tie", lane === 0 ? undefined : lane),
	);
}

/**
 * Packed voices: lanes are already fixed by structure. The check is the
 * width guard: an event past the last lane would have nowhere to sound, so it
 * is a loud error, never a silent drop. No `descend`: voices adds no
 * randomness, and seq wraps every pattern in it, so it must not move paths.
 * `stable` and `rr` read history instead (voices/history-voices.ts).
 */
export function queryPackedVoices(n: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const evs = query(child, span, ctx);
	for (const ev of evs) {
		if (laneOf(ev) >= n) {
			throw new Error(
				`voices: an event landed in lane ${laneOf(ev)}, but there are only ${n} lanes`,
			);
		}
	}
	return evs;
}

/**
 * Each child event gains the value of each field's event that holds its
 * onset; a field whose pattern rests (or ties) there is left out. Field i
 * queries at path index i + 1.
 */
export function queryWith(fields: readonly RecordField[], child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	return query(child, span, ctx).map((ev) => {
		const at = (ev.whole ?? ev.part).begin;
		const own: Record<string, number> = {};
		fields.forEach((field, i) => {
			const value = fieldAt(field.pat, at, descend(ctx, "with", i + 1));
			if (value !== null) own[field.name] = value;
		});
		return Object.keys(own).length === 0 ? ev : { ...ev, fields: { ...ev.fields, ...own } };
	});
}

/** The value of `pat`'s note or slide whose whole holds `at`; null when none does. */
function fieldAt(pat: Pat, at: R, ctx: QueryCtx): number | null {
	const evs = query(pat, { begin: at, end: radd(at, r(1, 1_000_000)) }, ctx);
	for (let i = evs.length - 1; i >= 0; i--) {
		const ev = evs[i] as Ev;
		const holds = ev.whole === null || rlte(ev.whole.begin, at);
		if (holds && (ev.kind === "note" || ev.kind === "slide")) return ev.value;
	}
	return null;
}

/** Map integer index events onto the active slot's chord-tone table. */
export function queryChordIdx(
	tables: readonly (readonly number[])[],
	per: number,
	child: Pat,
	span: Span,
	ctx: QueryCtx,
): Ev[] {
	const cycle = rfloor(span.begin);
	const slot = Math.floor(cycle / per) % tables.length;
	const table = tables[((slot % tables.length) + tables.length) % tables.length] as readonly number[];
	const len = table.length;
	return query(child, span, descend(ctx, "chordidx", 0)).map((ev) => {
		const i = Math.round(ev.value);
		const octave = Math.floor(i / len);
		const tone = table[((i % len) + len) % len] as number;
		return { ...ev, value: tone + 12 * octave };
	});
}
