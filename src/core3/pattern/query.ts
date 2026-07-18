/**
 * Pattern interpreter. `query(pat, span, ctx)` evaluates a Pat AST over a
 * cycle-span into events, entirely in rational time (never floats).
 *
 * Multi-cycle spans split at cycle boundaries (Tidal's splitQueries); every
 * per-op rule may assume its span lies inside one cycle. Child recursion goes
 * back through `query`, so time-warped child spans re-split correctly.
 *
 * `ctx.path` is a stable integer identity for the current AST position: it
 * mixes (op, childIndex) on every descent. `degrade` rolls hash01(seed, path,
 * cycle-of-whole) once per event position — scrub-safe, thread-identical.
 */

import type { Pat, PatOp, WChild } from "./ast";
import { bjorklund } from "./bjorklund";
import type { Ev, Span } from "./event";
import { avalanche, hash01 } from "./random";
import {
	type R,
	R0,
	R1,
	r,
	radd,
	rcmp,
	rcycle,
	rdiv,
	rfloor,
	rlt,
	rmax,
	rmin,
	rmul,
	rsub,
} from "./rational";

export interface QueryCtx {
	readonly seed: number;
	/** Stable integer id of the current AST position (mixed on descent). */
	readonly path: number;
}

export function query(pat: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const out: Ev[] = [];
	for (const cycleSpan of splitCycles(span)) out.push(...queryCycle(pat, cycleSpan, ctx));
	return out;
}

/** Split a span at cycle boundaries; drops empty spans. */
function splitCycles(span: Span): Span[] {
	const spans: Span[] = [];
	let begin = span.begin;
	while (rlt(begin, span.end)) {
		const end = rmin(r(rfloor(begin) + 1), span.end);
		spans.push({ begin, end });
		begin = end;
	}
	return spans;
}

/** Dispatch for a span already inside a single cycle. */
function queryCycle(pat: Pat, span: Span, ctx: QueryCtx): Ev[] {
	switch (pat.op) {
		case "pure":
			return queryPure(pat.value, span);
		case "silence":
			return [];
		case "fastcat":
			return queryFastcat(pat.children, span, ctx);
		case "slowcat":
			return querySlowcat(pat.children, span, ctx);
		case "stack":
			return pat.children.flatMap((child, i) => query(child, span, descend(ctx, "stack", i)));
		case "fast":
			return queryScaled(pat.factor, pat.child, span, descend(ctx, "fast", 0));
		case "slow":
			return queryScaled(rdiv(R1, pat.factor), pat.child, span, descend(ctx, "slow", 0));
		case "rev":
			return queryRev(pat.child, span, descend(ctx, "rev", 0));
		case "early":
			return queryShifted(pat.amount, pat.child, span, descend(ctx, "early", 0));
		case "late":
			return queryShifted(rsub(R0, pat.amount), pat.child, span, descend(ctx, "late", 0));
		case "iter":
			return queryIter(pat.n, pat.child, span, descend(ctx, "iter", 0));
		case "ply":
			return queryPly(pat.n, pat.child, span, descend(ctx, "ply", 0));
		case "euclid":
			return queryEuclid(pat, span, ctx);
		case "degrade":
			return queryDegrade(pat.prob, pat.child, span, ctx);
		case "add":
			return mapValues(pat.child, span, descend(ctx, "add", 0), (v) => v + pat.amount);
		case "mul":
			return mapValues(pat.child, span, descend(ctx, "mul", 0), (v) => v * pat.amount);
		case "every":
			return queryEvery(pat.n, pat.child, pat.transformed, span, ctx);
		case "tieNext":
			return query(pat.child, span, descend(ctx, "tieNext", 0)).map((ev) => ({
				...ev,
				tieNext: true,
			}));
		case "tiePrev":
			return query(pat.child, span, descend(ctx, "tiePrev", 0)).map((ev) => ({
				...ev,
				tiePrev: true,
			}));
	}
}

// ---------------------------------------------------------------------------
// Structural paths
// ---------------------------------------------------------------------------

const OP_CODE: Record<PatOp, number> = {
	pure: 1,
	silence: 2,
	fastcat: 3,
	slowcat: 4,
	stack: 5,
	fast: 6,
	slow: 7,
	rev: 8,
	early: 9,
	late: 10,
	iter: 11,
	ply: 12,
	euclid: 13,
	degrade: 14,
	add: 15,
	mul: 16,
	every: 17,
	tieNext: 18,
	tiePrev: 19,
};

function descend(ctx: QueryCtx, op: PatOp, index: number): QueryCtx {
	const mixed = avalanche(Math.imul(ctx.path | 0, 0x9e3779b1) ^ (OP_CODE[op] * 131 + index));
	return { seed: ctx.seed, path: mixed | 0 };
}

// ---------------------------------------------------------------------------
// Time warping
// ---------------------------------------------------------------------------

type TimeMap = (t: R) => R;

/** Query the child under a bijective time map; map results back. */
function warp(child: Pat, span: Span, ctx: QueryCtx, toChild: TimeMap, toParent: TimeMap): Ev[] {
	const childSpan = { begin: toChild(span.begin), end: toChild(span.end) };
	return query(child, childSpan, ctx).map((ev) => mapEvTime(ev, toParent));
}

function mapEvTime(ev: Ev, f: TimeMap): Ev {
	return {
		...ev,
		whole: ev.whole ? { begin: f(ev.whole.begin), end: f(ev.whole.end) } : null,
		part: { begin: f(ev.part.begin), end: f(ev.part.end) },
	};
}

function queryScaled(factor: R, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	return warp(
		child,
		span,
		ctx,
		(t) => rmul(t, factor),
		(t) => rdiv(t, factor),
	);
}

function queryShifted(amount: R, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	return warp(
		child,
		span,
		ctx,
		(t) => radd(t, amount),
		(t) => rsub(t, amount),
	);
}

// ---------------------------------------------------------------------------
// Per-op semantics
// ---------------------------------------------------------------------------

function queryPure(value: number, span: Span): Ev[] {
	const cycle = rfloor(span.begin);
	return [{ whole: { begin: r(cycle), end: r(cycle + 1) }, part: span, value }];
}

/**
 * Weighted subdivision slot. The cycle is divided proportionally to weights;
 * each occupied slot squeezes its child so the child sees the slot as the
 * full current cycle (local cycle = global cycle).
 */
interface Slot {
	readonly pat: Pat | null; // null = silent slot
	readonly weight: R;
	readonly pathIndex: number;
}

function querySlots(slots: readonly Slot[], span: Span, ctx: QueryCtx, op: PatOp): Ev[] {
	const total = slots.reduce((acc, s) => radd(acc, s.weight), R0);
	const cycleStart = r(rfloor(span.begin));
	const out: Ev[] = [];
	let cursor = R0;
	for (const slot of slots) {
		const next = radd(cursor, slot.weight);
		if (slot.pat) {
			const slotBegin = radd(cycleStart, rdiv(cursor, total));
			const slotEnd = radd(cycleStart, rdiv(next, total));
			const begin = rmax(span.begin, slotBegin);
			const end = rmin(span.end, slotEnd);
			if (rlt(begin, end)) {
				const scale = rdiv(total, slot.weight);
				const toLocal: TimeMap = (t) => radd(cycleStart, rmul(rsub(t, slotBegin), scale));
				const toGlobal: TimeMap = (t) => radd(slotBegin, rdiv(rsub(t, cycleStart), scale));
				out.push(
					...warp(slot.pat, { begin, end }, descend(ctx, op, slot.pathIndex), toLocal, toGlobal),
				);
			}
		}
		cursor = next;
	}
	return out;
}

function queryFastcat(children: readonly WChild[], span: Span, ctx: QueryCtx): Ev[] {
	const slots = children.map((wc, i) => ({ pat: wc.pat, weight: wc.weight, pathIndex: i }));
	return querySlots(slots, span, ctx, "fastcat");
}

function querySlowcat(children: readonly Pat[], span: Span, ctx: QueryCtx): Ev[] {
	const n = children.length;
	const cycle = rfloor(span.begin);
	const index = ((cycle % n) + n) % n;
	const child = children[index];
	if (!child) return [];
	// The child sees a contiguous cycle count so inner alternations advance.
	const innerCycle = Math.floor(cycle / n);
	const offset = r(cycle - innerCycle);
	return warp(
		child,
		span,
		descend(ctx, "slowcat", index),
		(t) => rsub(t, offset),
		(t) => radd(t, offset),
	);
}

function queryRev(child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const cycle = rfloor(span.begin);
	const reflect: TimeMap = (t) => rsub(r(2 * cycle + 1), t);
	const childSpan = { begin: reflect(span.end), end: reflect(span.begin) };
	// Reflection reverses time, so it also reverses emission order; restore
	// part-onset order so consumers see events front-to-back.
	return query(child, childSpan, ctx)
		.map((ev) => ({
			...ev,
			whole: ev.whole ? { begin: reflect(ev.whole.end), end: reflect(ev.whole.begin) } : null,
			part: { begin: reflect(ev.part.end), end: reflect(ev.part.begin) },
		}))
		.sort((a, b) => rcmp(a.part.begin, b.part.begin));
}

function queryIter(n: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const cycle = rfloor(span.begin);
	const step = ((cycle % n) + n) % n;
	return queryShifted(r(step, n), child, span, ctx);
}

function queryPly(n: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const out: Ev[] = [];
	for (const ev of query(child, span, ctx)) {
		if (!ev.whole) {
			out.push(ev);
			continue;
		}
		const step = rdiv(rsub(ev.whole.end, ev.whole.begin), r(n));
		for (let i = 0; i < n; i++) {
			const wholeBegin = radd(ev.whole.begin, rmul(step, r(i)));
			const wholeEnd = radd(wholeBegin, step);
			const partBegin = rmax(wholeBegin, ev.part.begin);
			const partEnd = rmin(wholeEnd, ev.part.end);
			if (!rlt(partBegin, partEnd)) continue;
			out.push({
				whole: { begin: wholeBegin, end: wholeEnd },
				part: { begin: partBegin, end: partEnd },
				value: ev.value,
				...(ev.tiePrev && i === 0 ? { tiePrev: true } : {}),
				...(ev.tieNext && i === n - 1 ? { tieNext: true } : {}),
			});
		}
	}
	return out;
}

function queryEuclid(
	pat: { readonly k: number; readonly steps: number; readonly rot: number; readonly child: Pat },
	span: Span,
	ctx: QueryCtx,
): Ev[] {
	const mask = bjorklund(pat.k, pat.steps);
	const slots = mask.map((_, i) => ({
		pat: mask[(((i + pat.rot) % pat.steps) + pat.steps) % pat.steps] ? pat.child : null,
		weight: R1,
		pathIndex: 0, // one child, one identity — every active slot shares it
	}));
	return querySlots(slots, span, ctx, "euclid");
}

function queryDegrade(prob: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	// One roll per (event's whole cycle, this node's path); KEEP when hash >= prob.
	return query(child, span, descend(ctx, "degrade", 0)).filter((ev) => {
		const at = ev.whole ? ev.whole.begin : ev.part.begin;
		return hash01(ctx.seed, ctx.path, rcycle(at)) >= prob;
	});
}

function mapValues(child: Pat, span: Span, ctx: QueryCtx, f: (v: number) => number): Ev[] {
	return query(child, span, ctx).map((ev) => ({ ...ev, value: f(ev.value) }));
}

function queryEvery(n: number, child: Pat, transformed: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const cycle = rfloor(span.begin);
	const active = ((cycle % n) + n) % n === 0;
	return active
		? query(transformed, span, descend(ctx, "every", 1))
		: query(child, span, descend(ctx, "every", 0));
}
