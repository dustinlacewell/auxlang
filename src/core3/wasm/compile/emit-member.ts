/**
 * Field and index reads, and the places a write can go. A tick's state
 * fields, outputs and cache slots are locals; a helper's cache slots are in
 * memory at its hidden base; a reducer's lanes are an f32 view in memory,
 * read the way the engine's Float32Array reads them.
 */

import type { AnyNode, MemberExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { emitExpr, emitValue } from "./emit-expression";
import type { FnEmitter } from "./fn-emitter";
import { resolve } from "./resolve";
import { staticOf } from "./static-value";
import type { Kind, Lanes } from "./values";

/** The name of the math call cache array in bound text (module/bind-math/cache-names.ts). */
const CACHE_ARRAY = "__mc";

/** Where a write goes: a local, or an f64 in memory at a base local (null: address 0) plus an offset. */
export type Target =
	| { readonly k: "local"; readonly index: number; readonly kind: Kind }
	| { readonly k: "memory"; readonly base: number | null; readonly offset: number };

export function emitMemberRead(e: FnEmitter, node: MemberExpression): Kind {
	if (!node.computed) return emitValue(e, resolve(e, node), node);
	const cache = cacheTarget(e, node);
	if (cache !== null) return readTarget(e, cache);
	const owner = resolve(e, node.object);
	if (owner?.k !== "lanes") return e.fail(node, "only lane arrays and the math cache are indexed");
	readLane(e, owner.lanes, node.property);
	return "f64";
}

/** The place `node` names for a write. */
export function targetOf(e: FnEmitter, node: AnyNode): Target {
	if (node.type === "MemberExpression" && node.computed) {
		const cache = cacheTarget(e, node);
		if (cache !== null) return cache;
		return e.fail(node, "only the math cache is written by index");
	}
	const value = resolve(e, node);
	if (value?.k === "local") return { k: "local", index: value.index, kind: value.kind };
	return e.fail(node, "this cannot be assigned");
}

export function readTarget(e: FnEmitter, t: Target): Kind {
	if (t.k === "local") {
		e.code.get(t.index);
		return t.kind;
	}
	pushBase(e, t);
	e.code.loadF64(t.offset);
	return "f64";
}

/** Before the value: a memory write needs its address on the stack first. */
export function beginWrite(e: FnEmitter, t: Target): void {
	if (t.k === "memory") pushBase(e, t);
}

/** After the value (already of the target's kind): store it, leaving it on the stack when `keep`. */
export function endWrite(e: FnEmitter, t: Target, keep: boolean): void {
	if (t.k === "local") {
		if (keep) e.code.tee(t.index);
		else e.code.set(t.index);
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

function pushBase(e: FnEmitter, t: Target & { k: "memory" }): void {
	if (t.base === null) e.code.i32Const(0);
	else e.code.get(t.base);
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

/**
 * `lanes[i]`: the f32 lane promoted to f64. An index that is not an integer
 * in range reads `undefined`, which is NaN as a number.
 */
function readLane(e: FnEmitter, lanes: Lanes, property: AnyNode): void {
	const index = staticOf(e, property);
	if (index !== null && typeof index.v === "number") {
		e.code
			.i32Const(0)
			.loadF32(lanes.addr + 4 * index.v)
			.op(OP.f64PromoteF32);
		return;
	}
	const kind = emitExpr(e, property);
	if (kind !== "f64") e.code.op(kind === "int" ? OP.f64ConvertI32S : OP.f64ConvertI32U);
	const t = e.local("f64");
	e.code.set(t);
	// t >= 0 && t < length && trunc(t) === t
	e.code.get(t).f64Const(0).op(OP.f64Ge);
	e.code.get(t).f64Const(lanes.length).op(OP.f64Lt).op(OP.i32And);
	e.code.get(t).op(OP.f64Trunc).get(t).op(OP.f64Eq).op(OP.i32And);
	e.enter(OP.if, "f64");
	e.code.get(t).op(OP.i32TruncF64U).i32Const(2).op(OP.i32Shl);
	e.code.loadF32(lanes.addr).op(OP.f64PromoteF32);
	e.else();
	e.code.f64Const(Number.NaN);
	e.exit();
}
