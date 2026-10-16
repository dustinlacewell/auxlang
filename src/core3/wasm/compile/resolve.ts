/**
 * Names and fields to values, without emitting code: a local, a parameter
 * record, a tick's state field, input or output, a config value, state in
 * memory (a field of a record, a record of an array at a constant index), an
 * array's length, a Math constant. A record at a run-time index needs code
 * for its address: place.ts.
 */

import type { AnyNode, MemberExpression } from "acorn";
import { MATH_CONSTANTS } from "../../math/math-constants";
import type { FnEmitter } from "./fn-emitter";
import { validIndex } from "../../module/front/types/valid-index";
import { type MemoryValue, type Value, fixed, inMemory, local } from "./values";

/** The value `node` names, when it is a name or a field; null for anything else. */
export function resolve(e: FnEmitter, node: AnyNode): Value | null {
	if (node.type === "Identifier") return e.scope.lookup(node.name) ?? null;
	if (node.type === "MemberExpression") return resolveMember(e, node);
	return null;
}

/** Field `field` of state in memory: a record's field, or an array's length. */
export function fieldOf(owner: MemoryValue, field: string): Value | null {
	const shape = owner.shape;
	if (shape.k === "array" || shape.k === "records")
		return field === "length" ? fixed(shape.length) : null;
	if (shape.k !== "record") return null;
	const f = shape.fields[field];
	if (f === undefined) return null;
	return inMemory(f.shape, { base: owner.at.base, offset: owner.at.offset + f.offset });
}

function resolveMember(e: FnEmitter, node: MemberExpression): Value | null {
	const owner = node.object.type === "Identifier" ? e.scope.lookup(node.object.name) : undefined;
	const parent = owner ?? (node.object.type === "MemberExpression" ? resolve(e, node.object) : null);
	if (node.computed) return parent?.k === "memory" ? recordAtConstant(e, parent, node.property) : null;
	if (node.property.type !== "Identifier") return null;
	const field = node.property.name;
	if (owner === undefined && node.object.type === "Identifier") {
		const isMath = node.object.name === "Math";
		return isMath && MATH_CONSTANTS.has(field) ? fixed(Math[field as keyof Math] as number) : null;
	}
	if (parent === null || parent === undefined) return null;
	if (parent.k === "memory") return fieldOf(parent, field);
	if (parent.k !== "role") return null;
	const roles = e.ctx.roles;
	if (roles === null) return e.fail(node, "parameter records exist only in a tick");
	switch (parent.role) {
		case "state":
			return roles.state(field, node);
		case "ins":
			return roles.input(field, node);
		case "outs":
			return local(roles.output(field, node), "f64");
		case "config":
			return fixed(roles.config(field, node));
	}
}

/** `list[3]` of an array of records: the record, at a constant address. */
function recordAtConstant(e: FnEmitter, owner: MemoryValue, property: AnyNode): Value | null {
	const shape = owner.shape;
	if (shape.k !== "records") return null;
	const index = e.fold(property);
	if (index === null || typeof index.v !== "number" || !validIndex(index.v, shape.length))
		return null;
	const offset = owner.at.offset + index.v * shape.element.size;
	return inMemory(shape.element, { base: owner.at.base, offset });
}
