/**
 * What `node` names, emitting code where a name needs it: a record of an
 * array of records at a run-time index (`s.voices[k]`) gets its address
 * computed into an i32 local, in JS evaluation order, trapping on an invalid
 * index as JS throws on `undefined.x`. A reassigned array or record variable
 * is address-variable.ts. Everything else is resolve.ts.
 */

import type { AnyNode } from "acorn";
import { placeOfAddress } from "./address-variable";
import type { FnEmitter } from "./fn-emitter";
import { addressOrTrap, emitIndex } from "./index-access";
import { fieldOf, resolve } from "./resolve";
import { type Value, inMemory } from "./values";

export function placeOf(e: FnEmitter, node: AnyNode): Value | null {
	const known = resolve(e, node);
	const address = placeOfAddress(e, node, known?.k === "memory" ? known : null);
	if (address !== null) return address;
	if (known !== null || node.type !== "MemberExpression") return known;
	const owner = placeOf(e, node.object);
	if (owner?.k !== "memory") return null;
	if (!node.computed)
		return node.property.type === "Identifier" ? fieldOf(owner, node.property.name) : null;
	const shape = owner.shape;
	if (shape.k !== "records") return null;
	const index = emitIndex(e, node.property, shape.length);
	const span = { at: owner.at, length: shape.length, size: shape.element.size };
	return inMemory(shape.element, addressOrTrap(e, span, index, node));
}
