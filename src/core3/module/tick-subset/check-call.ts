/**
 * Calls. A tick may call `Math.*`, its helpers, and `hashRandom(key)`. No
 * method calls (`.push`, `.fill`, ...) and no calls through locals.
 * `Math.random()` and `hashRandom(key)` draw from the module's random state,
 * so they belong to the tick, which owns that state through its first
 * parameter.
 */

import type { CallExpression } from "acorn";
import { type SubsetContext, isBound } from "./subset-context";

const ONLY = "only Math.*, helpers and hashRandom(key) may be called (no method calls)";

export function checkCall(node: CallExpression, ctx: SubsetContext): void {
	if (node.optional) ctx.fail(node, "optional calls are not allowed");
	const callee = node.callee;
	if (callee.type === "Identifier" && !isBound(ctx, callee.name)) {
		if (ctx.helpers.has(callee.name)) {
			ctx.calls.push({ name: callee.name, node });
			return;
		}
		if (callee.name === "hashRandom") {
			checkRandomCall(node, "hashRandom(key)", 1, ctx);
			return;
		}
	}
	if (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.object.type === "Identifier" &&
		callee.object.name === "Math" &&
		!isBound(ctx, "Math") &&
		callee.property.type === "Identifier"
	) {
		const name = callee.property.name;
		if (typeof (Math as unknown as Record<string, unknown>)[name] !== "function")
			ctx.fail(node, `Math.${name} is not a function`);
		if (name === "random") checkRandomCall(node, "Math.random()", 0, ctx);
		return;
	}
	ctx.fail(node, ONLY);
}

function checkRandomCall(
	node: CallExpression,
	form: string,
	arity: number,
	ctx: SubsetContext,
): void {
	if (ctx.kind !== "tick")
		ctx.fail(
			node,
			`${form} is available only in tick, which owns the random stream — pass the value in`,
		);
	if (node.arguments.length !== arity)
		ctx.fail(node, `${form} takes ${arity === 0 ? "no arguments" : "one argument, the key"}`);
	if (ctx.roles.state === undefined)
		ctx.fail(node, `${form} needs the tick's first parameter (the state) to be named`);
}
