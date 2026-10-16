/** Whether `call` calls the intrinsic `name` (not a local that shadows it). */

import type { CallExpression } from "acorn";
import { type RuleContext, resolutionOf } from "./rule-context";

export function isIntrinsicCall(call: CallExpression, name: string, ctx: RuleContext): boolean {
	if (call.callee.type !== "Identifier") return false;
	const r = resolutionOf(ctx, call.callee);
	return r?.k === "intrinsic" && r.name === name;
}
