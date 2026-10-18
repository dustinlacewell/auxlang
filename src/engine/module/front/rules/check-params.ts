/** The function itself: plain, synchronous, with plain-name parameters. */

import type { FunctionNode } from "@/engine/module/front/parse/parse-function";
import type { RuleContext } from "./rule-context";

export function checkParams(fn: FunctionNode, ctx: RuleContext): void {
	if (fn.async) ctx.fail(fn, "async functions are not allowed");
	if (fn.generator) ctx.fail(fn, "generators are not allowed");
	for (const param of fn.params)
		if (param.type !== "Identifier")
			ctx.fail(param, "parameters must be plain names (no destructuring, defaults or rest)");
}
