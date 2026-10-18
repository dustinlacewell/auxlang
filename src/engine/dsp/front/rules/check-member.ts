/**
 * Field reads. `Math` gives its constants and its callees, never a function
 * as a value. A computed key must be a number (an index), never a string;
 * named reads of inputs, outputs and state must name a field that exists, so
 * a typo is a loud error instead of a silent `undefined`.
 */

import type { AnyNode, MemberExpression } from "acorn";
import { MATH_CONSTANTS } from "@/engine/math/math-constants";
import { type RuleContext, resolutionOf, roleOf } from "./rule-context";

export function checkMember(
	node: MemberExpression,
	parent: AnyNode | null,
	key: string | null,
	ctx: RuleContext,
): void {
	if (node.computed) {
		checkComputedKey(node, ctx);
		return;
	}
	if (node.object.type !== "Identifier" || node.property.type !== "Identifier") return;
	const field = node.property.name;
	if (resolutionOf(ctx, node.object)?.k === "math") {
		if (MATH_CONSTANTS.has(field)) return;
		if (parent?.type === "CallExpression" && key === "callee") return;
		if (field in Math) ctx.fail(node, `Math.${field} may only be called`);
		ctx.fail(node, `Math.${field} does not exist`);
	}
	const role = roleOf(ctx, node.object);
	if (role === "ins" && !ctx.ins.has(field))
		ctx.fail(node, `unknown input '${field}' (inputs: ${[...ctx.ins].join(", ")})`);
	if (role === "outs" && !ctx.outs.has(field))
		ctx.fail(node, `unknown output '${field}' (outputs: ${[...ctx.outs].join(", ")})`);
	if (role === "state" && !(field in ctx.state))
		ctx.fail(node, `unknown state field '${field}' — declare it in state()`);
}

function checkComputedKey(node: MemberExpression, ctx: RuleContext): void {
	const key = node.property;
	if (key.type === "Literal" && typeof key.value === "string")
		ctx.fail(
			node,
			"computed property names with non-numeric keys are not allowed — use a fixed field name",
		);
	if (roleOf(ctx, node.object) === "state")
		ctx.fail(node, "state fields must be named, not computed");
}
