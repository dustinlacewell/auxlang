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
 * whole.begin) once per event — scrub-safe, thread-identical.
 */

import type { Layer, Pat, PatOp, SignalKind, StepLayer, WChild } from "./ast";
import { bjorklund } from "./bjorklund";
import type { Ev, EvKind, Span } from "./event";
import { isOnset, laneOf, startsHere } from "./event";
import { avalanche, hash01 } from "./random";
import {
	type R,
	R0,
	R1,
	r,
	radd,
	rcmp,
	rdiv,
	req,
	rfloor,
	rlt,
	rlte,
	rmax,
	rmin,
	rmul,
	rsub,
	rtof,
} from "./rational";
import { locateStep } from "./step-locate";
import { inLayer, stepOnsets } from "./step-onsets";
import { type HistoryPolicy, type HistoryRead, historyVoices } from "./voices/history-voices";
import { width } from "./widths";

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
			return [sited(cycleEvent(span, pat.value, "note"), pat.site)];
		case "silence":
			return [];
		case "rest":
			return [sited(cycleEvent(span, 0, "rest"), pat.site)];
		case "tie":
			return queryTie(pat.lanes, span).map((ev) => sited(ev, pat.site));
		case "slide":
			return querySlide(pat.child, span, descend(ctx, "slide", 0));
		// No `descend` for steps and compact: they add no randomness, so a pattern
		// drops the same notes read by time, by steps, or compacted.
		case "steps":
			return querySteps(pat.layers, pat.child, span, ctx);
		case "compact":
			return query(pat.child, span, ctx).filter((ev) => ev.kind !== "rest");
		case "fastcat":
			return queryFastcat(pat.children, span, ctx);
		case "timecat":
			return queryTimecat(pat.children, span, ctx);
		case "slowcat":
			return querySlowcat(pat.children, span, ctx);
		case "stack":
			return queryStack(pat.children, span, ctx);
		case "polymeter":
			return queryPolymeter(pat.layers, span, ctx);
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
		// No `descend`: swing moves only time, so a swung pattern drops the same notes.
		case "swing":
			return querySwing(pat.amount, pat.n, pat.child, span, ctx);
		case "ply":
			return queryPly(pat.n, pat.child, span, descend(ctx, "ply", 0));
		case "euclid":
			return queryEuclid(pat, span, ctx);
		case "degrade":
			return queryDegrade(pat.prob, pat.child, span, ctx);
		case "seed":
			// A fresh root: the child queries as a whole pattern would at this seed.
			return query(pat.child, span, { seed: pat.seed, path: 0 });
		case "add":
			return mapValues(pat.child, span, descend(ctx, "add", 0), (v) => v + pat.amount);
		case "mul":
			return mapValues(pat.child, span, descend(ctx, "mul", 0), (v) => v * pat.amount);
		case "every":
			return queryEvery(pat.n, pat.child, pat.transformed, span, ctx);
		case "mask":
			return queryMask(pat.bool, pat.child, span, ctx);
		case "struct":
			return queryStruct(pat.bool, pat.child, span, ctx);
		case "segment":
			return querySegment(pat.n, pat.child, span, ctx);
		case "clip":
			return queryClip(pat.factor, pat.child, span, descend(ctx, "clip", 0));
		case "chunk":
			return queryChunk(pat.n, pat.child, pat.transformed, span, ctx);
		case "sometimesBy":
			return querySometimes(pat.prob, pat.child, pat.transformed, span, ctx);
		case "signal":
			return querySignal(pat.kind, span, ctx);
		case "chordidx":
			return queryChordIdx(pat.tables, pat.per, pat.child, span, ctx);
		case "voices":
			return pat.policy === "packed"
				? queryPackedVoices(pat.n, pat.child, span, ctx)
				: historyVoices(historyRead(pat, pat.policy, ctx), span);
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
	mask: 20,
	struct: 21,
	segment: 22,
	clip: 23,
	chunk: 24,
	sometimesBy: 25,
	signal: 26,
	chordidx: 27,
	voices: 28,
	timecat: 29,
	polymeter: 30,
	rest: 31,
	tie: 32,
	slide: 33,
	steps: 34, // never descended into (see queryCycle)
	compact: 35, // never descended into
	seed: 36, // never descended into: it starts a fresh path
	swing: 37, // never descended into
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

const HALF = r(1, 2);
const TWO = r(2);

/**
 * Swing: inside each of n slots per cycle, time is bent so the slot's
 * midpoint lands at `mid = (1 + amount) / 2`. The first half stretches and the
 * second squeezes, so an off-beat onset lands where Strudel's swingBy puts
 * it, while slot edges stay put: no event gains an overlap or a gap, and
 * width, ties and slides are unchanged.
 */
function querySwing(amount: R, n: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
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

// ---------------------------------------------------------------------------
// Per-op semantics
// ---------------------------------------------------------------------------

/** One event whose whole is the span's cycle. */
function cycleEvent(span: Span, value: number, kind: EvKind, lane?: number): Ev {
	const cycle = rfloor(span.begin);
	const whole = { begin: r(cycle), end: r(cycle + 1) };
	return lane === undefined ? { whole, part: span, value, kind } : { whole, part: span, value, kind, lane };
}

/** A leaf's event carries the leaf's site, when it has one (metadata only). */
function sited(ev: Ev, site: number | undefined): Ev {
	return site === undefined ? ev : { ...ev, site };
}

/** A tie in each lane, so a chord ties in every lane. A tie has no value of its own. */
function queryTie(lanes: number, span: Span): Ev[] {
	return Array.from({ length: lanes }, (_, lane) =>
		cycleEvent(span, 0, "tie", lane === 0 ? undefined : lane),
	);
}

/** The child's notes become slides; rests and ties keep their kind. */
function querySlide(child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	return query(child, span, ctx).map((ev) => (ev.kind === "note" ? { ...ev, kind: "slide" } : ev));
}

/**
 * Step `n` (the span's cycle) of each layer: find the child cycle and step it
 * comes from, and re-time the events starting at that step's onset to span
 * [n, n+1). Lanes are kept.
 */
function querySteps(layers: readonly StepLayer[], child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const n = rfloor(span.begin);
	const whole = { begin: r(n), end: r(n + 1) };
	const cycles = new Map<number, Ev[]>();
	const cycleEvents = (c: number): Ev[] => {
		let evs = cycles.get(c);
		if (evs === undefined) {
			evs = query(child, { begin: r(c), end: r(c + 1) }, ctx);
			cycles.set(c, evs);
		}
		return evs;
	};
	const out: Ev[] = [];
	for (const layer of layers) {
		const source = locateStep(layer.counts, n);
		if (source === null) continue;
		const evs = cycleEvents(source.cycle);
		const at = stepOnsets(evs, layer)[source.index];
		if (at === undefined) continue;
		for (const ev of evs) {
			if (inLayer(ev, layer) && startsHere(ev) && req((ev.whole as Span).begin, at)) {
				out.push({ ...ev, whole, part: span });
			}
		}
	}
	return out;
}

/** The same event as a rest: its slot stays, its gate is off. */
const asRest = (ev: Ev): Ev => (ev.kind === "rest" ? ev : { ...ev, kind: "rest" });

/** Simultaneous children; each child's lanes sit above the lanes of the children before it. */
function queryStack(children: readonly Pat[], span: Span, ctx: QueryCtx): Ev[] {
	const out: Ev[] = [];
	let offset = 0;
	children.forEach((child, i) => {
		out.push(...shiftLanes(query(child, span, descend(ctx, "stack", i)), offset));
		offset += width(child);
	});
	return out;
}

/**
 * Layers played together, lanes stacked like `stack`. Each layer runs at the
 * first layer's steps per cycle, so a layer of `k` steps is sped up by
 * `steps / k`.
 */
function queryPolymeter(layers: readonly Layer[], span: Span, ctx: QueryCtx): Ev[] {
	const steps = (layers[0] as Layer).steps;
	const out: Ev[] = [];
	let offset = 0;
	layers.forEach((layer, i) => {
		const factor = rdiv(steps, layer.steps);
		const evs = queryScaled(factor, layer.pat, span, descend(ctx, "polymeter", i));
		out.push(...shiftLanes(evs, offset));
		offset += width(layer.pat);
	});
	return out;
}

function shiftLanes(evs: Ev[], offset: number): Ev[] {
	return offset === 0 ? evs : evs.map((ev) => ({ ...ev, lane: laneOf(ev) + offset }));
}

/**
 * Packed voices: lanes are already fixed by structure. The check is the
 * width guard: an event past the last lane would have nowhere to sound, so it
 * is a loud error, never a silent drop. No `descend`: voices adds no
 * randomness, and seq wraps every pattern in it, so it must not move paths.
 * `stable` and `rr` read history instead (voices/history-voices.ts).
 */
/** A `stable` or `rr` voices node, read through this interpreter at `ctx`. */
export function historyRead(
	pat: Extract<Pat, { op: "voices" }>,
	policy: HistoryPolicy,
	ctx: QueryCtx,
): HistoryRead {
	return {
		node: pat,
		policy,
		n: pat.n,
		seed: ctx.seed,
		path: ctx.path,
		queryChild: (span) => query(pat.child, span, ctx),
	};
}

function queryPackedVoices(n: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
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
 * Weighted subdivision slot. The cycle is divided proportionally to weights;
 * each slot squeezes its child so the child sees the slot as the full current
 * cycle (local cycle = global cycle).
 */
interface Slot {
	readonly pat: Pat;
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
		cursor = next;
	}
	return out;
}

function queryFastcat(children: readonly Pat[], span: Span, ctx: QueryCtx): Ev[] {
	const slots = children.map((pat, i) => ({ pat, weight: R1, pathIndex: i }));
	return querySlots(slots, span, ctx, "fastcat");
}

function queryTimecat(children: readonly WChild[], span: Span, ctx: QueryCtx): Ev[] {
	const slots = children.map((wc, i) => ({ pat: wc.pat, weight: wc.weight, pathIndex: i }));
	return querySlots(slots, span, ctx, "timecat");
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

function queryEuclid(
	pat: { readonly k: number; readonly steps: number; readonly rot: number; readonly child: Pat },
	span: Span,
	ctx: QueryCtx,
): Ev[] {
	const mask = bjorklund(pat.k, pat.steps);
	const empty: Pat = { op: "rest" };
	const slots = mask.map((_, i) => ({
		pat: mask[(((i + pat.rot) % pat.steps) + pat.steps) % pat.steps] ? pat.child : empty,
		weight: R1,
		pathIndex: 0, // one child, one identity — every active slot shares it
	}));
	return querySlots(slots, span, ctx, "euclid");
}

function queryDegrade(prob: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	// One roll per event, keyed by its absolute onset (whole.begin as n/d);
	// that onset already encodes the cycle, so events within a cycle roll
	// independently. KEEP when hash >= prob, else the slot stays as a rest.
	// Scrub-safe, thread-identical.
	return query(child, span, descend(ctx, "degrade", 0)).map((ev) => {
		const at = ev.whole ? ev.whole.begin : ev.part.begin;
		return hash01(ctx.seed, ctx.path, at.n, at.d) >= prob ? ev : asRest(ev);
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

// ---------------------------------------------------------------------------
// Boolean-driven ops, sampling, and continuous signals
// ---------------------------------------------------------------------------

/** The sounding value of a pattern at a single instant, or null when a rest, a tie, or nothing is there. */
function sampleAt(pat: Pat, at: R, ctx: QueryCtx): number | null {
	const evs = query(pat, { begin: at, end: radd(at, r(1, 1_000_000)) }, ctx);
	const ev = evs[evs.length - 1];
	return ev !== undefined && (ev.kind === "note" || ev.kind === "slide") ? ev.value : null;
}

/** A bool pattern's "true" mark is any onset with a nonzero value. */
function trueSpans(bool: Pat, span: Span, ctx: QueryCtx): Span[] {
	return query(bool, span, ctx)
		.filter((ev) => isOnset(ev) && ev.value !== 0 && ev.whole !== null)
		.map((ev) => ev.whole as Span);
}

/** Child events whose onset lands outside a true region of bool become rests. */
function queryMask(bool: Pat, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const spans = trueSpans(bool, span, descend(ctx, "mask", 0));
	const inside = (t: R) => spans.some((s) => rlte(s.begin, t) && rlt(t, s.end));
	return query(child, span, descend(ctx, "mask", 1)).map((ev) =>
		inside(ev.part.begin) ? ev : asRest(ev),
	);
}

/** A note at each true bool step, sampling child's value there; a rest at each other bool step. */
function queryStruct(bool: Pat, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const out: Ev[] = [];
	for (const ev of query(bool, span, descend(ctx, "struct", 0))) {
		if (!startsHere(ev) || ev.whole === null) continue;
		const value = isOnset(ev) && ev.value !== 0 ? sampleAt(child, ev.part.begin, descend(ctx, "struct", 1)) : null;
		const base = { whole: ev.whole, part: ev.part, ...(ev.lane !== undefined ? { lane: ev.lane } : {}) };
		out.push(value === null ? { ...base, value: 0, kind: "rest" } : { ...base, value, kind: "note" });
	}
	return out;
}

/** Sample child into n equal steps per cycle (sample-and-hold at each step); an unsounding sample is a rest. */
function querySegment(n: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const cycle = rfloor(span.begin);
	const out: Ev[] = [];
	for (let i = 0; i < n; i++) {
		const begin = radd(r(cycle), r(i, n));
		const end = radd(r(cycle), r(i + 1, n));
		const b = rmax(span.begin, begin);
		const e = rmin(span.end, end);
		if (!rlt(b, e)) continue;
		const value = sampleAt(child, begin, descend(ctx, "segment", 0));
		const whole = { begin, end };
		const part = { begin: b, end: e };
		out.push(value === null ? { whole, part, value: 0, kind: "rest" } : { whole, part, value, kind: "note" });
	}
	return out;
}

/** Shrink each event's whole to `factor` of its length (gate/note length). */
function queryClip(factor: number, child: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const f = asR01(factor);
	return query(child, span, ctx).map((ev) => {
		if (!ev.whole) return ev;
		const len = rsub(ev.whole.end, ev.whole.begin);
		const end = radd(ev.whole.begin, rmul(len, f));
		return { ...ev, whole: { begin: ev.whole.begin, end } };
	});
}

/** every(n) with a rotating slice: cycle c transforms slice (c % n) of n. */
function queryChunk(n: number, child: Pat, transformed: Pat, span: Span, ctx: QueryCtx): Ev[] {
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

/** Per event, use transformed's value and kind with probability prob (seeded), else child. */
function querySometimes(
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
		return match ? { ...ev, value: match.value, kind: match.kind } : ev;
	});
}

/** Continuous generator sampled at the queried point's onset. */
function querySignal(kind: SignalKind, span: Span, ctx: QueryCtx): Ev[] {
	const value = signalValue(kind, span.begin, ctx);
	return [{ whole: null, part: span, value, kind: "note" }];
}

function signalValue(kind: SignalKind, at: R, ctx: QueryCtx): number {
	const t = rtof(at);
	switch (kind) {
		case "rand":
			// S&H per queried instant: hash the rational position so segment(n)
			// and struct sample distinct values within a cycle (like degrade).
			return hash01(ctx.seed, ctx.path, at.n, at.d);
		case "perlin":
			return perlin1(ctx.seed, ctx.path, t);
		case "sine":
			return 0.5 + 0.5 * Math.sin(2 * Math.PI * t);
		case "saw":
			return t - Math.floor(t);
		case "isaw":
			return 1 - (t - Math.floor(t));
		case "tri": {
			const p = t - Math.floor(t);
			return p < 0.5 ? p * 2 : 2 - p * 2;
		}
		default:
			return 0;
	}
}

/** Value-noise 1D: smoothstep-interpolated hash at integer lattice points. */
function perlin1(seed: number, path: number, t: number): number {
	const i = Math.floor(t);
	const f = t - i;
	const a = hash01(seed, path, i);
	const b = hash01(seed, path, i + 1);
	const s = f * f * (3 - 2 * f);
	return a + (b - a) * s;
}

const asR01 = (x: number): R => r(Math.min(Math.max(x, 0), 1) * 1_000_000, 1_000_000);

/** Map integer index events onto the active slot's chord-tone table. */
function queryChordIdx(
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
