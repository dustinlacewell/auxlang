/**
 * `??` (and `??=`) only on a direct array element read: `a[j] ?? d`. An
 * element at an invalid index is the one run-time `undefined` every backend
 * agrees on: JS reads `undefined`, WASM tests the index and takes the right
 * side. Kept in a local first (`const x = a[j]; x ?? 0`), the value is
 * `undefined` in JS but NaN in a WASM local, so only the direct form is
 * allowed. A chain `a[j] ?? b[k] ?? d` is direct at every step.
 */

import type { AnyNode } from "acorn";
import type { RuleContext } from "./rule-context";

export function checkNullish(left: AnyNode, ctx: RuleContext): void {
	if (isDirectElement(left)) return;
	ctx.fail(
		left,
		"`??` is allowed only on a direct array element read (`a[j] ?? d`) — an element kept in a local first cannot be tested for `undefined` the same way on every backend",
	);
}

function isDirectElement(node: AnyNode): boolean {
	if (node.type === "MemberExpression") return node.computed;
	if (node.type === "LogicalExpression" && node.operator === "??")
		return isDirectElement(node.left) && isDirectElement(node.right);
	return false;
}
