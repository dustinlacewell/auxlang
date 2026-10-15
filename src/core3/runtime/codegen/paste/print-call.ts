/**
 * A call in a pasted function. Two forms paste: a helper (its pasted
 * function name) and `Math.<fn>(...)` (host math). The text is bound
 * (module/bind-random/), so a tick's randomness is already helper calls on
 * its state; a `Math.random()` left over would be the host's and is refused.
 * Anything else is refused.
 */

import type { CallExpression } from "acorn";
import { refuse } from "./not-pasteable";
import type { PasteContext } from "./paste-context";
import { printExpression } from "./print-expression";
import { mathMember } from "./print-member";

export function printCall(node: CallExpression, ctx: PasteContext): string {
	if (node.optional) refuse("optional calls are not pasteable");
	const args = node.arguments.map((a) =>
		a.type === "SpreadElement" ? refuse("spread is not pasteable") : printExpression(a, ctx),
	);
	const callee = node.callee;
	if (callee.type === "Identifier" && !ctx.locals.has(callee.name)) {
		const helper = ctx.helpers.get(callee.name);
		if (helper !== undefined) return `${helper}(${args.join(", ")})`;
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
		if (name === "random")
			refuse("Math.random() is pasteable only once bound to the lane's stream");
		if (typeof (Math as unknown as Record<string, unknown>)[name] !== "function")
			refuse(`Math.${name} is not a function`);
		return `${mathMember(name)}(${args.join(", ")})`;
	}
	return refuse("only helpers and Math.* calls are pasteable");
}
