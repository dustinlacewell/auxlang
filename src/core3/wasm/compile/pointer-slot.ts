/**
 * A rebound state field (`s.a = s.b`) or element of an array of records
 * (`s.voices[0] = s.voices[1]`; layout/state-shape.ts `Field`,
 * `RecordsShape`): its i32 pointer slot holds the address of the array or
 * record it names now. A read loads the slot into a fresh local where JS
 * evaluates the field or element, so a rebind later in the same expression
 * leaves the read alone. A rebind evaluates the owner (and the index), then
 * the right side, then stores the right side's address into the slot: JS's
 * order. Both then name one value, as in JS; the plan (front/types/unify.ts)
 * proves it has the slot's shape, and an element's index in range
 * (front/types/field-fault.ts `grows`).
 */

import type { AnyNode, AssignmentExpression, MemberExpression } from "acorn";
import { OP } from "../encode/opcodes";
import type { RecordsShape } from "../layout/state-shape";
import { REBINDS, pushAddress, refAt } from "./address-variable";
import type { FnEmitter } from "./fn-emitter";
import { addressOrTrap, emitIndex } from "./index-access";
import { placeOf } from "./place";
import { fieldOf, resolve } from "./resolve";
import { type Address, type MemoryValue, type PointerValue, inMemory } from "./values";

/** The value a rebound field or element names now, its address in a fresh i32 local. */
export function loadPointer(e: FnEmitter, slot: PointerValue): MemoryValue {
	const base = e.local("int");
	pushBase(e, slot.slot);
	e.code.memory(OP.i32Load, 2, slot.slot.offset).set(base);
	return inMemory(slot.shape, { base, offset: 0 });
}

/** The slot of element `property` of `owner`, an array of records with a pointer table: evaluates the index. */
export function elementSlot(
	e: FnEmitter,
	owner: MemoryValue & { shape: RecordsShape },
	property: AnyNode,
	at: AnyNode,
): Address {
	const { shape } = owner;
	const table = { base: owner.at.base, offset: owner.at.offset + (shape.pointers as number) };
	const index = emitIndex(e, property, shape.length);
	return addressOrTrap(e, { at: table, length: shape.length, size: 4 }, index, at);
}

/** Whether `node` stores an array or record into a field or an element. */
export function isPointerRebind(e: FnEmitter, node: AssignmentExpression): boolean {
	return node.left.type === "MemberExpression" && e.typeOf(node.left).k === "ref";
}

/** `s.a = s.b`, `s.voices[0] = s.voices[1]`: the slot takes the right side's address; returns the right side's place. */
export function emitPointerRebind(e: FnEmitter, node: AssignmentExpression): MemoryValue {
	if (!REBINDS.has(node.operator) || node.left.type !== "MemberExpression")
		return e.fail(node, "a field or element holding an array or record is only ever rebound by `=` or `&&=` (compiler bug)");
	const slot = slotOf(e, node.left);
	const value = refAt(e, node.right);
	pushBase(e, slot);
	pushAddress(e, value.at);
	e.code.memory(OP.i32Store, 2, slot.offset);
	return value;
}

/** The pointer slot of the field or element `target` names, emitting the code that finds its owner and index. */
function slotOf(e: FnEmitter, target: MemberExpression): Address {
	const owner = placeOf(e, target.object);
	if (target.computed) {
		if (owner?.k === "memory" && owner.shape.k === "records" && owner.shape.pointers !== undefined)
			return elementSlot(e, owner as MemoryValue & { shape: RecordsShape }, target.property, target);
		return e.fail(target, "a rebound element has no pointer slot (compiler bug)");
	}
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
