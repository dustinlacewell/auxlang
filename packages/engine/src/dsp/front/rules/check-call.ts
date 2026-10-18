/**
 * Calls. A tick may call `Math.*`, its helpers, `hashRandom(key)` and, when
 * its module reads a pattern, the table intrinsics (table-intrinsics.ts). No
 * method calls (`.push`, `.fill`, ...) and no calls through locals.
 * `Math.random()` and `hashRandom(key)` draw from the module's random state,
 * so they belong to the tick, which owns that state through its first
 * parameter.
 */

import type { CallExpression } from "acorn";
import { AUX_MATH_FUNCTIONS } from "../../../math/aux-math-functions";
import { EXACT_HOST_MATH } from "../../../math/exact-host-math";
import { checkTableCall } from "./check-table-call";
import { type RuleContext, hasRole, resolutionOf } from "./rule-context";

const ONLY = "only Math.*, helpers and hashRandom(key) may be called (no method calls)";

export function checkCall(node: CallExpression, ctx: RuleContext): void {
	if (node.optional) ctx.fail(node, "optional calls are not allowed");
	const callee = node.callee;
	const named = callee.type === "Identifier" ? resolutionOf(ctx, callee) : undefined;
	if (named?.k === "helper") {
		ctx.calls.push({ name: named.name, node });
		return;
	}
	if (named?.k === "intrinsic") {
		if (named.name === "hashRandom") checkRandomCall(node, "hashRandom(key)", 1, ctx);
		else checkTableCall(node, named.name, ctx);
		return;
	}
	if (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.object.type === "Identifier" &&
		resolutionOf(ctx, callee.object)?.k === "math" &&
		callee.property.type === "Identifier"
	) {
		const name = callee.property.name;
		if (name === "random") checkRandomCall(node, "Math.random()", 0, ctx);
		else checkMathCall(node, name, ctx);
		return;
	}
	ctx.fail(node, ONLY);
}

/**
 * A tick calls auxlang's math (bind-math/) or an exact host operation —
 * never host transcendentals, which differ between engines (MANIFESTO §7).
 */
function checkMathCall(node: CallExpression, name: string, ctx: RuleContext): void {
	const arity = AUX_MATH_FUNCTIONS.get(name);
	if (arity !== undefined) {
		if (node.arguments.length !== arity)
			ctx.fail(node, `Math.${name} takes ${arity === 1 ? "one argument" : `${arity} arguments`}`);
		return;
	}
	if (EXACT_HOST_MATH.has(name)) return;
	ctx.fail(
		node,
		`Math.${name} is not available in a tick (auxlang math: ${[...AUX_MATH_FUNCTIONS.keys(), ...EXACT_HOST_MATH, "random"].sort().join(", ")})`,
	);
}

function checkRandomCall(
	node: CallExpression,
	form: string,
	arity: number,
	ctx: RuleContext,
): void {
	if (ctx.kind !== "tick")
		ctx.fail(
			node,
			`${form} is available only in tick, which owns the random stream — pass the value in`,
		);
	if (node.arguments.length !== arity)
		ctx.fail(node, `${form} takes ${arity === 0 ? "no arguments" : "one argument, the key"}`);
	if (!hasRole(ctx, "state"))
		ctx.fail(node, `${form} needs the tick's first parameter (the state) to be named`);
}
