/**
 * The name a call is made by: `sin` in `sin(3)`, `lpf` in `x.lpf(800)`, `p`
 * in p`...`. Null for a computed callee (`f()()`, `x[k]()`).
 */

import type { AnyNode } from "acorn";

export function calleeName(callee: AnyNode): string | null {
	if (callee.type === "Identifier") return callee.name;
	if (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.property.type === "Identifier"
	)
		return callee.property.name;
	return null;
}

/** Where a call's range starts: the method name of a member call, else the callee. */
export function calleeStart(callee: AnyNode): number {
	if (callee.type === "MemberExpression" && !callee.computed) return callee.property.start;
	return callee.start;
}
