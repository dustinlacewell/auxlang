/**
 * Names and fields to values, without emitting code: a local, a parameter
 * record, a tick's state field, input or output, a config value, a lane
 * array or its length, a Math constant.
 */

import type { AnyNode, MemberExpression } from "acorn";
import { MATH_CONSTANTS } from "../../math/math-constants";
import type { FnEmitter } from "./fn-emitter";
import { type Value, fixed, local } from "./values";

/** The value `node` names, when it is a name or a field; null for anything else. */
export function resolve(e: FnEmitter, node: AnyNode): Value | null {
	if (node.type === "Identifier") return e.scope.lookup(node.name) ?? null;
	if (node.type === "MemberExpression") return resolveMember(e, node);
	return null;
}

function resolveMember(e: FnEmitter, node: MemberExpression): Value | null {
	const owner = node.object.type === "Identifier" ? e.scope.lookup(node.object.name) : undefined;
	if (node.computed) return null;
	if (node.property.type !== "Identifier") return null;
	const field = node.property.name;
	if (owner === undefined) {
		const isMath = node.object.type === "Identifier" && node.object.name === "Math";
		return isMath && MATH_CONSTANTS.has(field) ? fixed(Math[field as keyof Math] as number) : null;
	}
	if (owner.k === "lanes") return field === "length" ? fixed(owner.lanes.length) : null;
	if (owner.k !== "role") return null;
	const roles = e.ctx.roles;
	if (roles === null) return e.fail(node, "parameter records exist only in a tick");
	switch (owner.role) {
		case "state":
			return local(roles.state(field, node), "f64");
		case "ins":
			return roles.input(field, node);
		case "outs":
			return local(roles.output(field, node), "f64");
		case "config":
			return fixed(roles.config(field, node));
	}
}
