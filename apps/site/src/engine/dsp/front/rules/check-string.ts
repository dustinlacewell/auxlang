/**
 * No runtime strings. A string literal may appear only where it is compared
 * (`cfg.mode === "lp"`, a `case "lp":`), as a `hashRandom` key (it folds
 * to a number when bound), naming a table row field
 * (`__tableRow("end", row)`), or initialising a `const`/`let` that is never
 * reassigned (its only uses are then themselves compile-time-resolvable:
 * the local reads as the same literal everywhere). `typeof` may appear only
 * inside a comparison. `delete`, `in` and `instanceof` reshape or probe
 * objects and are not allowed.
 */

import type { AnyNode, BinaryExpression, Literal, UnaryExpression, VariableDeclarator } from "acorn";
import { bindingDeclaredBy } from "@/engine/dsp/front/scope/binding";
import { isWritten } from "@/engine/dsp/front/scope/writes";
import { isRowFieldLiteral } from "./check-table-call";
import { isIntrinsicCall } from "./is-intrinsic-call";
import type { RuleContext } from "./rule-context";

const EQUALITY = new Set(["===", "!==", "==", "!="]);

export function checkStringLiteral(
	node: Literal,
	parent: AnyNode | null,
	key: string | null,
	ctx: RuleContext,
): void {
	if (typeof node.value !== "string") return;
	if (isComparison(parent) || isHashKey(parent, key, ctx)) return;
	if (parent?.type === "SwitchCase" && key === "test") return;
	if (isRowFieldLiteral(node, parent, ctx)) return;
	if (isNeverReassignedInit(node, parent, ctx)) return;
	if (parent?.type === "ExpressionStatement" && "directive" in parent) return;
	ctx.fail(node, "string values may appear only in comparisons — runtime strings are not allowed");
}

export function checkUnary(
	node: UnaryExpression,
	parent: AnyNode | null,
	ctx: RuleContext,
): void {
	if (node.operator === "delete")
		ctx.fail(node, "`delete` removes fields — state shapes are fixed");
	if (node.operator === "typeof" && !isComparison(parent))
		ctx.fail(node, "`typeof` gives a string — use it only in a comparison");
}

export function checkBinary(node: BinaryExpression, ctx: RuleContext): void {
	if (node.operator === "in" || node.operator === "instanceof")
		ctx.fail(
			node,
			`\`${node.operator}\` is not allowed — shapes are fixed, so there is nothing to probe`,
		);
}

/** `const target = "lp"` (or `let`, never reassigned): every read of `target` is the same literal. */
function isNeverReassignedInit(node: Literal, parent: AnyNode | null, ctx: RuleContext): boolean {
	if (parent?.type !== "VariableDeclarator" || (parent as VariableDeclarator).init !== node) return false;
	const id = (parent as VariableDeclarator).id;
	if (id.type !== "Identifier") return false;
	const binding = bindingDeclaredBy(ctx.scopes, id);
	return binding !== undefined && !isWritten(ctx.writes, binding);
}

/** `hashRandom("kick")`: the key folds to its fnv1a32 hash when bound (bind-random/). */
function isHashKey(parent: AnyNode | null, key: string | null, ctx: RuleContext): boolean {
	return (
		parent?.type === "CallExpression" &&
		key === "arguments" &&
		isIntrinsicCall(parent, "hashRandom", ctx)
	);
}

function isComparison(parent: AnyNode | null): boolean {
	return parent?.type === "BinaryExpression" && EQUALITY.has(parent.operator);
}
