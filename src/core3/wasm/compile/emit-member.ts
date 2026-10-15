/**
 * Field and index reads, and the places a write can go. A tick's numeric
 * state fields, outputs and cache slots are locals; a helper's cache slots
 * are in memory at its hidden base; typed arrays, records and a reducer's
 * lanes are in memory (layout/state-shape.ts). An array element follows the
 * JS typed-array rules (index-access.ts, element-io.ts): a read at an invalid
 * index is `undefined` (NaN, or the right side of `??`), a write there does
 * nothing.
 */

import type { AnyNode, MemberExpression } from "acorn";
import { ELEMENT_BYTES } from "../layout/element-type";
import type { ArrayShape } from "../layout/state-shape";
import { toF64 } from "./coerce";
import { emitLoad, emitStore } from "./element-io";
import { emitExpr, emitValue } from "./emit-expression";
import type { FnEmitter } from "./fn-emitter";
import { type Index, type Span, emitIndex, guarded } from "./index-access";
import { placeOf } from "./place";
import { staticOf } from "./static-value";
import type { Address, Kind } from "./values";

/** The name of the math call cache array in bound text (module/bind-math/cache-names.ts). */
const CACHE_ARRAY = "__mc";

/**
 * Where a write goes: a local; an f64 in memory at a base local (null:
 * address 0) plus an offset; or an array element at an index evaluated once.
 */
export type Target =
	| { readonly k: "local"; readonly index: number; readonly kind: Kind }
	| { readonly k: "memory"; readonly base: number | null; readonly offset: number }
	| {
			readonly k: "element";
			readonly shape: ArrayShape;
			readonly at: Address;
			readonly index: Index;
	  };

export function emitMemberRead(e: FnEmitter, node: MemberExpression): Kind {
	return emitMemberReadOr(e, node, null);
}

/**
 * `node ?? orElse`: an array element at an invalid index is `undefined`, so
 * `orElse` runs. The checker (tick-subset/check-nullish.ts) allows nothing
 * else on the left. A chain `a ?? b ?? c` is `a ?? (b ?? c)`.
 */
export function emitNullish(e: FnEmitter, node: AnyNode, orElse: () => Kind): Kind {
	const known = staticOf(e, node);
	if (known !== null)
		return known.v === undefined || known.v === null ? orElse() : emitExpr(e, node);
	if (node.type === "MemberExpression") return emitMemberReadOr(e, node, orElse);
	if (node.type === "LogicalExpression" && node.operator === "??")
		return emitNullish(e, node.left, () => emitNullish(e, node.right, orElse));
	return e.fail(node, "`??` needs a direct array element on its left (`a[j] ?? d`)");
}

/** The place `node` names for a write. Emits what JS evaluates first: the array, then the index. */
export function targetOf(e: FnEmitter, node: AnyNode): Target {
	if (node.type === "MemberExpression" && node.computed) {
		const cache = cacheTarget(e, node);
		if (cache !== null) return cache;
		const array = arrayOf(e, node.object);
		return { k: "element", shape: array.shape, at: array.at, index: emitIndex(e, node.property) };
	}
	const value = placeOf(e, node);
	if (value?.k === "local") return { k: "local", index: value.index, kind: value.kind };
	if (value?.k === "memory" && value.shape.k === "number")
		return { k: "memory", base: value.at.base, offset: value.at.offset };
	return e.fail(node, "this cannot be assigned");
}

export function readTarget(e: FnEmitter, t: Target): Kind {
	if (t.k === "local") {
		e.code.get(t.index);
		return t.kind;
	}
	if (t.k === "element") {
		readElement(e, t.shape, t.at, t.index, null);
		return "f64";
	}
	pushBase(e, t.base);
	e.code.loadF64(t.offset);
	return "f64";
}

/** Before the value: a memory write needs its address on the stack first. */
export function beginWrite(e: FnEmitter, t: Target): void {
	if (t.k === "memory") pushBase(e, t.base);
}

/**
 * After the value (already of the target's kind): store it, leaving it on
 * the stack when `keep`. An element store is skipped at an invalid index,
 * and the expression's value is the number assigned, not the stored one.
 */
export function endWrite(e: FnEmitter, t: Target, keep: boolean): void {
	if (t.k === "local") {
		if (keep) e.code.tee(t.index);
		else e.code.set(t.index);
		return;
	}
	if (t.k === "element") {
		writeElement(e, t, keep);
		return;
	}
	if (!keep) {
		e.code.storeF64(t.offset);
		return;
	}
	const temp = e.local("f64");
	e.code.tee(temp).storeF64(t.offset).get(temp);
}

export function kindOfTarget(t: Target): Kind {
	return t.k === "local" ? t.kind : "f64";
}

function emitMemberReadOr(e: FnEmitter, node: MemberExpression, orElse: (() => Kind) | null): Kind {
	if (!node.computed) return emitValue(e, placeOf(e, node), node);
	const cache = cacheTarget(e, node);
	if (cache !== null) return readTarget(e, cache);
	const array = arrayOf(e, node.object);
	readElement(e, array.shape, array.at, emitIndex(e, node.property), orElse);
	return "f64";
}

/** The typed array (or reducer lane array) `node` names. */
function arrayOf(e: FnEmitter, node: AnyNode): { shape: ArrayShape; at: Address } {
	const owner = placeOf(e, node);
	if (owner?.k === "memory" && owner.shape.k === "array")
		return { shape: owner.shape, at: owner.at };
	return e.fail(node, "only typed arrays, lane arrays and the math cache are indexed");
}

function spanOf(shape: ArrayShape, at: Address): Span {
	return { at, length: shape.length, size: ELEMENT_BYTES[shape.type] };
}

function readElement(
	e: FnEmitter,
	shape: ArrayShape,
	at: Address,
	index: Index,
	orElse: (() => Kind) | null,
): void {
	guarded(
		e,
		spanOf(shape, at),
		index,
		"f64",
		(offset) => emitLoad(e, shape.type, offset),
		() => {
			if (orElse === null) e.code.f64Const(Number.NaN);
			else toF64(e, orElse());
		},
	);
}

function writeElement(e: FnEmitter, t: Target & { k: "element" }, keep: boolean): void {
	const value = e.local("f64");
	e.code.set(value);
	guarded(
		e,
		spanOf(t.shape, t.at),
		t.index,
		null,
		(offset) => {
			e.code.get(value);
			emitStore(e, t.shape.type, offset);
		},
		() => {},
	);
	if (keep) e.code.get(value);
}

function pushBase(e: FnEmitter, base: number | null): void {
	if (base === null) e.code.i32Const(0);
	else e.code.get(base);
}

/** `__mc[slot]`: a local in a tick, memory in a helper. */
function cacheTarget(e: FnEmitter, node: MemberExpression): Target | null {
	if (
		node.object.type !== "Identifier" ||
		node.object.name !== CACHE_ARRAY ||
		e.scope.lookup(CACHE_ARRAY) !== undefined
	)
		return null;
	const slot = staticOf(e, node.property);
	if (slot === null || typeof slot.v !== "number") return e.fail(node, "cache slots are constants");
	const cache = e.ctx.cache;
	if (cache === null) return e.fail(node, "this function has no math cache");
	if (cache.k === "locals") return { k: "local", index: cache.slot(slot.v), kind: "f64" };
	return { k: "memory", base: cache.base, offset: slot.v * 8 };
}
