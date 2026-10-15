/**
 * A call in a pasted function. Three forms paste: a helper (its pasted
 * function name), `Math.<fn>(...)` (host math; `Math.random()` becomes the
 * lane's stream step on the `__rng` local), and `hashRandom(key)` (the bound
 * function, with the `__seed` local as its seed — tick-build/bind-random.ts's
 * rewrite). Anything else is refused.
 */

import type { CallExpression } from "acorn";
import { refuse } from "./not-pasteable";
import type { PasteContext } from "./paste-context";
import { printExpression } from "./print-expression";
import { mathMember } from "./print-member";
import { randomDraw } from "./random-draw";

export function printCall(node: CallExpression, ctx: PasteContext): string {
	if (node.optional) refuse("optional calls are not pasteable");
	const args = node.arguments.map((a) =>
		a.type === "SpreadElement" ? refuse("spread is not pasteable") : printExpression(a, ctx),
	);
	const callee = node.callee;
	if (callee.type === "Identifier" && !ctx.locals.has(callee.name)) {
		const helper = ctx.helpers.get(callee.name);
		if (helper !== undefined) return `${helper}(${args.join(", ")})`;
		if (callee.name === "hashRandom") return hashRandomCall(args, ctx);
	}
	if (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		!callee.optional &&
		callee.object.type === "Identifier" &&
		callee.object.name === "Math" &&
		!ctx.locals.has("Math") &&
		callee.property.type === "Identifier"
	) {
		const name = callee.property.name;
		if (name === "random") return randomCall(args, ctx);
		if (typeof (Math as unknown as Record<string, unknown>)[name] !== "function")
			refuse(`Math.${name} is not a function`);
		return `${mathMember(name)}(${args.join(", ")})`;
	}
	return refuse("only helpers, Math.* and hashRandom(key) calls are pasteable");
}

function randomCall(args: readonly string[], ctx: PasteContext): string {
	if (args.length !== 0 || ctx.fields === null || ctx.roles.state === undefined)
		refuse("Math.random() is pasteable only as a tick's own draw");
	return randomDraw(ctx.fields.state("__rng", true));
}

function hashRandomCall(args: readonly string[], ctx: PasteContext): string {
	if (
		args.length !== 1 ||
		ctx.fields === null ||
		ctx.roles.state === undefined ||
		ctx.hashRandom === null
	)
		refuse("hashRandom(key) is pasteable only as a tick's own call");
	return `${ctx.hashRandom}(${args[0]}, ${ctx.fields.state("__seed", false)})`;
}
