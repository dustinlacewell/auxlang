/**
 * A rebound state field (`s.a = s.b`; layout/state-shape.ts `Field`): its
 * i32 pointer slot holds the address of the array or record it names now.
 * A read loads the slot into a fresh local where JS evaluates the field, so
 * a rebind later in the same expression leaves the read alone. A rebind
 * evaluates the owner, then the right side, then stores the right side's
 * address into the slot: JS's order. Both sides then name one value, as in
 * JS; the plan (front/types/unify.ts) proves it has the field's shape.
 */

import type { AssignmentExpression, MemberExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { REBINDS, pushAddress, refAt } from "./address-variable";
import type { FnEmitter } from "./fn-emitter";
import { placeOf } from "./place";
import { fieldOf, resolve } from "./resolve";
import { type Address, type MemoryValue, type PointerValue, inMemory } from "./values";

/** The value a rebound field names now, its address in a fresh i32 local. */
export function loadPointer(e: FnEmitter, field: PointerValue): MemoryValue {
	const base = e.local("int");
	pushBase(e, field.slot);
	e.code.memory(OP.i32Load, 2, field.slot.offset).set(base);
	return inMemory(field.shape, { base, offset: 0 });
}

/** Whether `node` stores an array or record into a named field. */
export function isFieldRebind(e: FnEmitter, node: AssignmentExpression): boolean {
	const left = node.left;
	return left.type === "MemberExpression" && !left.computed && e.typeOf(left).k === "ref";
}

/** `s.a = s.b`: the field's slot takes the right side's address; returns the right side's place. */
export function emitFieldRebind(e: FnEmitter, node: AssignmentExpression): MemoryValue {
	if (!REBINDS.has(node.operator) || node.left.type !== "MemberExpression")
		return e.fail(node, "a field holding an array or record is only ever rebound by `=` or `&&=` (compiler bug)");
	const slot = slotOf(e, node.left);
	const value = refAt(e, node.right);
	pushBase(e, slot);
	pushAddress(e, value.at);
	e.code.memory(OP.i32Store, 2, slot.offset);
	return value;
}

/** The pointer slot of the field `target` names, emitting the code that finds its owner. */
function slotOf(e: FnEmitter, target: MemberExpression): Address {
	const owner = placeOf(e, target.object);
	const name = target.property.type === "Identifier" ? target.property.name : null;
	const field =
		owner?.k === "role" ? resolve(e, target) : owner?.k === "memory" && name !== null ? fieldOf(owner, name) : null;
	if (field?.k !== "pointer")
		return e.fail(target, "a rebound field has no pointer slot (compiler bug)");
	return field.slot;
}

/** The slot's base on the stack (its offset goes in the load or store). */
function pushBase(e: FnEmitter, slot: Address): void {
	if (slot.base === null) e.code.i32Const(0);
	else e.code.get(slot.base);
}
