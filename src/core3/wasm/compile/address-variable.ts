/**
 * A variable that holds an array or record and is reassigned (`let a = s.a;
 * a = s.b`): an i32 local holds its address. The plan (front/types/unify.ts)
 * proves each value it takes has the variable's shape, so one layout reads
 * them all. A read copies the address when JS evaluates the name, so a
 * rebind later in the same expression (`a[(a = s.b, 0)]`) leaves it alone.
 */

import type { AnyNode, AssignmentExpression, Identifier } from "acorn";
import { OP } from "../encode/opcodes";
import type { FnEmitter } from "./fn-emitter";
import { placeOf } from "./place";
import { emitPointerRebind, isPointerRebind } from "./pointer-slot";
import { type Address, type MemoryValue, inMemory } from "./values";
import { referenceWritten } from "./written";

/** The operators that store an array or record: `=`, and `&&=` (an array or record is truthy). */
export const REBINDS: ReadonlySet<string> = new Set(["=", "&&="]);

export function declareAddress(e: FnEmitter, id: Identifier, init: AnyNode): void {
	e.bind(id, addressLocal(e, refAt(e, init)));
}

/** `held` with its address in a fresh i32 local, for a variable or helper parameter that is rebound. */
export function addressLocal(e: FnEmitter, held: MemoryValue): MemoryValue {
	const base = e.local("int");
	pushAddress(e, held.at);
	e.code.set(base);
	return inMemory(held.shape, { base, offset: 0 });
}

/** Whether `node` assigns to a variable holding an array or record. */
export function isRebind(e: FnEmitter, node: AssignmentExpression): boolean {
	return node.left.type === "Identifier" && e.typeOf(node.left).k === "ref";
}

/** `a = s.b`: the variable's address local takes the new address. */
export function emitRebind(e: FnEmitter, node: AssignmentExpression): void {
	const variable = node.left.type === "Identifier" ? e.valueOf(node.left) : null;
	if (!REBINDS.has(node.operator) || variable?.k !== "memory" || variable.at.base === null)
		e.fail(node, "an array variable is only ever rebound by `=` or `&&=`");
	pushAddress(e, refAt(e, node.right).at);
	e.code.set(variable.at.base);
}

/**
 * What a reassigned array or record variable, or a rebind (`(a = s.b)[0]`,
 * `(s.a = s.b)[0]`), names now; null for any other node.
 */
export function placeOfAddress(e: FnEmitter, node: AnyNode, known: MemoryValue | null): MemoryValue | null {
	if (node.type === "AssignmentExpression" && isRebind(e, node)) {
		emitRebind(e, node);
		return refAt(e, node.left);
	}
	if (node.type === "AssignmentExpression" && isPointerRebind(e, node)) return emitPointerRebind(e, node);
	const fn = e.ctx.fn;
	if (node.type !== "Identifier" || known === null || known.at.base === null) return null;
	if (fn === null || !referenceWritten(fn, node)) return null;
	const copy = e.local("int");
	e.code.get(known.at.base).set(copy);
	return inMemory(known.shape, { base: copy, offset: known.at.offset });
}

/** The array or record `node` names, emitting the code that finds it. */
export function refAt(e: FnEmitter, node: AnyNode): MemoryValue {
	const value = placeOf(e, node);
	if (value?.k !== "memory" || value.shape.k === "number")
		return e.fail(node, "the plan gives an array or record here, but it names none");
	return value;
}

export function pushAddress(e: FnEmitter, at: Address): void {
	if (at.base === null) {
		e.code.i32Const(at.offset);
		return;
	}
	e.code.get(at.base);
	if (at.offset !== 0) e.code.i32Const(at.offset).op(OP.i32Add);
}
