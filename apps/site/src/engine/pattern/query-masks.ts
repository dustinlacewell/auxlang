import type { Pat } from "./ast";
import { bjorklund } from "./bjorklund";
import type { Ev, Span } from "./event";
import { isOnset, startsHere } from "./event";
import {
	asRest,
	descend,
	type QueryCtx,
	query,
	querySlots,
	type Slot,
	sampleAt,
	sampledNote,
	shiftLanes,
} from "./query";
import { hash01 } from "./random";
import { type R, R1, r, radd, rcmp, rfloor, rlt, rlte } from "./rational";
import { width } from "./widths";

export function queryEuclid(
	pat: { readonly k: number; readonly steps: number; readonly rot: number; readonly child: Pat },
	span: Span,
	ctx: QueryCtx,
): Ev[] {
	const mask = bjorklund(pat.k, pat.steps);
	const empty: Pat = { op: "rest" };
	const slots: Slot[] = mask.map((_, i) => ({
		pat: mask[(((i + pat.rot) % pat.steps) + pat.steps) % pat.steps] ? pat.child : empty,
		weight: R1,
		pathIndex: 0, // one child, one identity — every active slot shares it
	}));
	return querySlots(slots, span, ctx, "euclid");
}

export function queryDegrade(prob: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	// One roll per event, keyed by its absolute onset (whole.begin as n/d);
	// that onset already encodes the cycle, so events within a cycle roll
	// independently. KEEP when hash >= prob, else the slot stays as a rest.
	// Scrub-safe, thread-identical.
	return query(child, span, descend(ctx, "degrade", 0)).map((ev) => {
		const at = ev.whole ? ev.whole.begin : ev.part.begin;
		return hash01(ctx.seed, ctx.path, at.n, at.d) >= prob ? ev : asRest(ev);
	});
}

/** A bool pattern's "true" mark is any onset with a nonzero value. */
function trueSpans(bool: Pat, span: Span, ctx: QueryCtx): Span[] {
	return query(bool, span, ctx)
		.filter((ev) => isOnset(ev) && ev.value !== 0 && ev.whole !== null)
		.map((ev) => ev.whole as Span);
}

/** Child events whose onset lands outside a true region of bool become rests. */
export function queryMask(bool: Pat, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const spans = trueSpans(bool, span, descend(ctx, "mask", 0));
	const inside = (t: R) => spans.some((s) => rlte(s.begin, t) && rlt(t, s.end));
	return query(child, span, descend(ctx, "mask", 1)).map((ev) =>
		inside(ev.part.begin) ? ev : asRest(ev),
	);
}

/** A note at each true bool step, sampling child's value there; a rest at each other bool step. */
export function queryStruct(bool: Pat, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const out: Ev[] = [];
	for (const ev of query(bool, span, descend(ctx, "struct", 0))) {
		if (!startsHere(ev) || ev.whole === null) continue;
		const sampled = isOnset(ev) && ev.value !== 0 ? sampleAt(child, ev.part.begin, descend(ctx, "struct", 1)) : null;
		const base = { whole: ev.whole, part: ev.part, ...(ev.lane !== undefined ? { lane: ev.lane } : {}) };
		out.push(sampled === null ? { ...base, value: 0, kind: "rest" } : sampledNote(base, sampled));
	}
	return out;
}

/** every(n) with a rotating slice: cycle c transforms slice (c % n) of n. */
export function queryChunk(n: number, child: Pat, transformed: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const cycle = rfloor(span.begin);
	const active = ((cycle % n) + n) % n;
	const sliceBegin = radd(r(cycle), r(active, n));
	const sliceEnd = radd(r(cycle), r(active + 1, n));
	const inSlice = (t: R) => rlte(sliceBegin, t) && rlt(t, sliceEnd);
	const base = query(child, span, descend(ctx, "chunk", 0)).filter((ev) => !inSlice(ev.part.begin));
	// Transformed lanes sit above the child's: a child event can ring on into the slice.
	const trans = shiftLanes(
		query(transformed, span, descend(ctx, "chunk", 1)).filter((ev) => inSlice(ev.part.begin)),
		width(child),
	);
	return [...base, ...trans].sort((a, b) => rcmp(a.part.begin, b.part.begin));
}

/** Per event, use transformed's value, kind and record fields with probability prob (seeded), else child. */
export function querySometimes(
	prob: number,
	child: Pat,
	transformed: Pat,
	span: Span,
	ctx: QueryCtx,
): Ev[] {
	const transEvs = query(transformed, span, descend(ctx, "sometimesBy", 1));
	return query(child, span, descend(ctx, "sometimesBy", 0)).map((ev) => {
		const at = ev.whole ? ev.whole.begin : ev.part.begin;
		if (hash01(ctx.seed, ctx.path, at.n, at.d) >= prob) return ev;
		const match = transEvs.find((t) => rcmp(t.part.begin, ev.part.begin) === 0);
		if (!match) return ev;
		const { fields: _child, ...rest } = ev;
		const fields = match.fields === undefined ? {} : { fields: match.fields };
		return { ...rest, value: match.value, kind: match.kind, ...fields };
	});
}
