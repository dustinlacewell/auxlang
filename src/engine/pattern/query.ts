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
 *
 * Per-op semantics live in sibling files by family: query-time (time
 * warping: fast/slow/rev/iter/ply/swing/clip), query-structure (stack,
 * polymeter, the cat family, every), query-masks (euclid, degrade, mask,
 * struct, chunk, sometimesBy), query-signal (segment, the continuous
 * generators), query-steps (tie, voices, with, chordidx). This file holds
 * the dispatch (`queryCycle`) and the helpers more than one family shares.
 */

import { randomFunctions } from "../dsp/bind-random/random-functions";
import type { Pat, PatOp, StepLayer } from "./ast";
import type { Ev, EvKind, Span } from "./event";
import { laneOf, startsHere } from "./event";
import { queryChunk, queryDegrade, queryEuclid, queryMask, querySometimes, queryStruct } from "./query-masks";
import { querySegment, querySignal } from "./query-signal";
import { queryChordIdx, queryPackedVoices, queryTie, queryWith } from "./query-steps";
import {
	queryEvery,
	queryFastcat,
	queryPolymeter,
	querySlowcat,
	queryStack,
	queryTimecat,
} from "./query-structure";
import {
	queryClip,
	queryIter,
	queryPly,
	queryRev,
	queryScaled,
	queryShifted,
	querySwing,
} from "./query-time";
import {
	type R,
	R0,
	R1,
	r,
	radd,
	rdiv,
	req,
	rfloor,
	rlt,
	rmax,
	rmin,
	rmul,
	rsub,
} from "./rational";
import { locateStep } from "./step-locate";
import { inLayer, stepOnsets } from "./step-onsets";
import { type HistoryPolicy, type HistoryRead, historyVoices } from "./voices/history-voices";

const { avalanche } = randomFunctions;

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
		// No `descend` into the child: adding fields does not move its random rolls.
		case "with":
			return queryWith(pat.fields, pat.child, span, ctx);
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
	with: 38, // descended into for its fields only
};

export function descend(ctx: QueryCtx, op: PatOp, index: number): QueryCtx {
	const mixed = avalanche(Math.imul(ctx.path | 0, 0x9e3779b1) ^ (OP_CODE[op] * 131 + index));
	return { seed: ctx.seed, path: mixed | 0 };
}

// ---------------------------------------------------------------------------
// Time warping — shared by query-time, query-structure (slowcat) and the
// weighted-slot helper below
// ---------------------------------------------------------------------------

export type TimeMap = (t: R) => R;

/** Query the child under a bijective time map; map results back. */
export function warp(child: Pat, span: Span, ctx: QueryCtx, toChild: TimeMap, toParent: TimeMap): Ev[] {
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

// ---------------------------------------------------------------------------
// Weighted subdivision slot — shared by query-structure (fastcat, timecat)
// and query-masks (euclid)
// ---------------------------------------------------------------------------

/**
 * Weighted subdivision slot. The cycle is divided proportionally to weights;
 * each slot squeezes its child so the child sees the slot as the full current
 * cycle (local cycle = global cycle).
 */
export interface Slot {
	readonly pat: Pat;
	readonly weight: R;
	readonly pathIndex: number;
}

export function querySlots(slots: readonly Slot[], span: Span, ctx: QueryCtx, op: PatOp): Ev[] {
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

// ---------------------------------------------------------------------------
// Lane helper — shared by query-structure (stack, polymeter) and query-masks
// (chunk)
// ---------------------------------------------------------------------------

export function shiftLanes(evs: Ev[], offset: number): Ev[] {
	return offset === 0 ? evs : evs.map((ev) => ({ ...ev, lane: laneOf(ev) + offset }));
}

// ---------------------------------------------------------------------------
// Event leaves — shared by queryCycle's own pure/rest cases and query-steps
// (tie)
// ---------------------------------------------------------------------------

/** One event whose whole is the span's cycle. */
export function cycleEvent(span: Span, value: number, kind: EvKind, lane?: number): Ev {
	const cycle = rfloor(span.begin);
	const whole = { begin: r(cycle), end: r(cycle + 1) };
	return lane === undefined ? { whole, part: span, value, kind } : { whole, part: span, value, kind, lane };
}

/** A leaf's event carries the leaf's site, when it has one (metadata only). */
function sited(ev: Ev, site: number | undefined): Ev {
	return site === undefined ? ev : { ...ev, site };
}

/** The same event as a rest: its slot stays, its gate is off. */
export const asRest = (ev: Ev): Ev => (ev.kind === "rest" ? ev : { ...ev, kind: "rest" });

// ---------------------------------------------------------------------------
// Sampling — shared by query-masks (struct) and query-signal (segment)
// ---------------------------------------------------------------------------

/** The sounding event of a pattern at a single instant, or null when a rest, a tie, or nothing is there. */
export function sampleAt(pat: Pat, at: R, ctx: QueryCtx): Ev | null {
	const evs = query(pat, { begin: at, end: radd(at, r(1, 1_000_000)) }, ctx);
	const ev = evs[evs.length - 1];
	return ev !== undefined && (ev.kind === "note" || ev.kind === "slide") ? ev : null;
}

/** A fresh note with a sampled event's value and record fields. */
export function sampledNote(base: Pick<Ev, "whole" | "part" | "lane">, sampled: Ev): Ev {
	return {
		...base,
		value: sampled.value,
		kind: "note",
		...(sampled.fields !== undefined ? { fields: sampled.fields } : {}),
	};
}

// ---------------------------------------------------------------------------
// queryCycle's own leaf cases (slide, steps, add/mul, voices history): each
// is used by exactly one switch arm above, so it stays local to the dispatch.
// ---------------------------------------------------------------------------

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

function mapValues(child: Pat, span: Span, ctx: QueryCtx, f: (v: number) => number): Ev[] {
	return query(child, span, ctx).map((ev) => ({ ...ev, value: f(ev.value) }));
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
