/**
 * Field reads. A computed key must be a number (an index), never a string;
 * named reads of inputs, outputs and state must name a field that exists, so
 * a typo is a loud error instead of a silent `undefined`.
 */

import type { MemberExpression } from "acorn";
import { type SubsetContext, isBound } from "./subset-context";

export function checkMember(node: MemberExpression, ctx: SubsetContext): void {
	if (node.computed) {
		checkComputedKey(node, ctx);
		return;
	}
	if (node.object.type !== "Identifier" || node.property.type !== "Identifier") return;
	const owner = node.object.name;
	const field = node.property.name;
	if (owner === "Math" && !isBound(ctx, "Math")) {
		if (!(field in Math)) ctx.fail(node, `Math.${field} does not exist`);
		return;
	}
	if (owner === ctx.roles.ins && !ctx.ins.has(field))
		ctx.fail(node, `unknown input '${field}' (inputs: ${[...ctx.ins].join(", ")})`);
	if (owner === ctx.roles.outs && !ctx.outs.has(field))
		ctx.fail(node, `unknown output '${field}' (outputs: ${[...ctx.outs].join(", ")})`);
	if (owner === ctx.roles.state && !(field in ctx.state))
		ctx.fail(node, `unknown state field '${field}' — declare it in state()`);
}

function checkComputedKey(node: MemberExpression, ctx: SubsetContext): void {
	const key = node.property;
	if (key.type === "Literal" && typeof key.value === "string")
		ctx.fail(
			node,
			"computed property names with non-numeric keys are not allowed — use a fixed field name",
		);
	if (node.object.type === "Identifier" && node.object.name === ctx.roles.state)
		ctx.fail(node, "state fields must be named, not computed");
}
