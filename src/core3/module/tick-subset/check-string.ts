/**
 * No runtime strings. A string literal may appear only where it is compared
 * (`cfg.mode === "lp"`, a `case "lp":`), and `typeof` only inside such a
 * comparison. `delete`, `in` and `instanceof` reshape or probe objects and
 * are not allowed.
 */

import type { AnyNode, BinaryExpression, Literal, UnaryExpression } from "acorn";
import type { SubsetContext } from "./subset-context";

const EQUALITY = new Set(["===", "!==", "==", "!="]);

export function checkStringLiteral(
	node: Literal,
	parent: AnyNode | null,
	key: string | null,
	ctx: SubsetContext,
): void {
	if (typeof node.value !== "string") return;
	if (isComparison(parent)) return;
	if (parent?.type === "SwitchCase" && key === "test") return;
	if (parent?.type === "ExpressionStatement" && "directive" in parent) return;
	ctx.fail(node, "string values may appear only in comparisons — runtime strings are not allowed");
}

export function checkUnary(
	node: UnaryExpression,
	parent: AnyNode | null,
	ctx: SubsetContext,
): void {
	if (node.operator === "delete")
		ctx.fail(node, "`delete` removes fields — state shapes are fixed");
	if (node.operator === "typeof" && !isComparison(parent))
		ctx.fail(node, "`typeof` gives a string — use it only in a comparison");
}

export function checkBinary(node: BinaryExpression, ctx: SubsetContext): void {
	if (node.operator === "in" || node.operator === "instanceof")
		ctx.fail(
			node,
			`\`${node.operator}\` is not allowed — shapes are fixed, so there is nothing to probe`,
		);
}

function isComparison(parent: AnyNode | null): boolean {
	return parent?.type === "BinaryExpression" && EQUALITY.has(parent.operator);
}
