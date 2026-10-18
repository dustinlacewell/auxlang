import type { Layer, Pat, WChild } from "./ast";
import type { Ev, Span } from "./event";
import { descend, type QueryCtx, query, querySlots, type Slot, shiftLanes, warp } from "./query";
import { queryScaled } from "./query-time";
import { R1, r, radd, rdiv, rfloor, rsub } from "./rational";
import { width } from "./widths";

/** Simultaneous children; each child's lanes sit above the lanes of the children before it. */
export function queryStack(children: readonly Pat[], span: Span, ctx: QueryCtx): Ev[] {
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
export function queryPolymeter(layers: readonly Layer[], span: Span, ctx: QueryCtx): Ev[] {
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

export function queryFastcat(children: readonly Pat[], span: Span, ctx: QueryCtx): Ev[] {
	const slots: Slot[] = children.map((pat, i) => ({ pat, weight: R1, pathIndex: i }));
	return querySlots(slots, span, ctx, "fastcat");
}

export function queryTimecat(children: readonly WChild[], span: Span, ctx: QueryCtx): Ev[] {
	const slots: Slot[] = children.map((wc, i) => ({ pat: wc.pat, weight: wc.weight, pathIndex: i }));
	return querySlots(slots, span, ctx, "timecat");
}

export function querySlowcat(children: readonly Pat[], span: Span, ctx: QueryCtx): Ev[] {
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

export function queryEvery(n: number, child: Pat, transformed: Pat, span: Span, ctx: QueryCtx): Ev[] {
	const cycle = rfloor(span.begin);
	const active = ((cycle % n) + n) % n === 0;
	return active
		? query(transformed, span, descend(ctx, "every", 1))
		: query(child, span, descend(ctx, "every", 0));
}
