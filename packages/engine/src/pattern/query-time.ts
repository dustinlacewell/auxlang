import type { Pat } from "./ast";
import type { Ev, Span } from "./event";
import { query, type QueryCtx, type TimeMap, warp } from "./query";
import { type R, R1, r, radd, rcmp, rdiv, rfloor, rlt, rmax, rmin, rmul, rsub } from "./rational";

export function queryScaled(factor: R, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	return warp(
		child,
		span,
		ctx,
		(t) => rmul(t, factor),
		(t) => rdiv(t, factor),
	);
}

export function queryShifted(amount: R, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	return warp(
		child,
		span,
		ctx,
		(t) => radd(t, amount),
		(t) => rsub(t, amount),
	);
}

const HALF = r(1, 2);
const TWO = r(2);

/**
 * Swing: inside each of n slots per cycle, time is bent so the slot's
 * midpoint lands at `mid = (1 + amount) / 2`. The first half stretches and the
 * second squeezes, so an off-beat onset lands where Strudel's swingBy puts
 * it, while slot edges stay put: no event gains an overlap or a gap, and
 * width, ties and slides are unchanged.
 */
export function querySwing(amount: R, n: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const mid = rdiv(radd(R1, amount), TWO);
	return warp(
		child,
		span,
		ctx,
		(t) => inSlots(t, n, (v) => straightAt(v, mid)),
		(t) => inSlots(t, n, (u) => swungAt(u, mid)),
	);
}

/** Apply `f` to t's position inside its 1/n slot. */
function inSlots(t: R, n: number, f: TimeMap): R {
	const scaled = rmul(t, r(n));
	const slot = r(rfloor(scaled));
	return rdiv(radd(slot, f(rsub(scaled, slot))), r(n));
}

/** A straight slot position u to its swung place: [0, ½) → [0, mid), [½, 1) → [mid, 1). */
function swungAt(u: R, mid: R): R {
	return rlt(u, HALF)
		? rmul(u, rmul(TWO, mid))
		: radd(mid, rmul(rsub(u, HALF), rmul(TWO, rsub(R1, mid))));
}

/** The inverse of swungAt. */
function straightAt(v: R, mid: R): R {
	return rlt(v, mid)
		? rdiv(v, rmul(TWO, mid))
		: radd(HALF, rdiv(rsub(v, mid), rmul(TWO, rsub(R1, mid))));
}

export function queryRev(child: Pat, span: Span, ctx: QueryCtx): Ev[] {
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

export function queryIter(n: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const cycle = rfloor(span.begin);
	const step = ((cycle % n) + n) % n;
	return queryShifted(r(step, n), child, span, ctx);
}

export function queryPly(n: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
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
				...ev,
				whole: { begin: wholeBegin, end: wholeEnd },
				part: { begin: partBegin, end: partEnd },
				// Only the first copy slides in; the repeats retrigger.
				kind: ev.kind === "slide" && i > 0 ? "note" : ev.kind,
			});
		}
	}
	return out;
}

/** Shrink each event's whole to `factor` of its length (gate/note length). */
export function queryClip(factor: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const f = asR01(factor);
	return query(child, span, ctx).map((ev) => {
		if (!ev.whole) return ev;
		const len = rsub(ev.whole.end, ev.whole.begin);
		const end = radd(ev.whole.begin, rmul(len, f));
		return { ...ev, whole: { begin: ev.whole.begin, end } };
	});
}

const asR01 = (x: number): R => r(Math.min(Math.max(x, 0), 1) * 1_000_000, 1_000_000);
