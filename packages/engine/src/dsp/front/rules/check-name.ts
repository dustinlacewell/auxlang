/**
 * Free names. A tick may name only its parameters, the locals in scope,
 * `Math`, its helpers, `hashRandom` and the table intrinsics — nothing from
 * the patch or the file around it, so the text alone is the whole machine.
 * `Math` must be read as `Math.name`; helpers, `hashRandom` and the
 * intrinsics must be called (check-call.ts says who may call them). A local
 * is used inside its block, after its declaration. Bound text also names the
 * math call cache, only as a slot (`__mc[3]`, bind-math/cache-names.ts);
 * written text may not (bind-math/rewrite-math.ts rejects it).
 */

import type { AnyNode, Identifier } from "acorn";
import { CACHE_ARRAY, cacheSlotOf } from "../../bind-math/cache-names";
import type { Binding } from "../scope/binding";
import { type RuleContext, resolutionOf } from "./rule-context";

export function checkName(
	node: Identifier,
	parent: AnyNode | null,
	key: string | null,
	ctx: RuleContext,
): void {
	const r = resolutionOf(ctx, node);
	if (r === undefined) return;
	switch (r.k) {
		case "binding":
			checkDeclaredBefore(node, r.binding, ctx);
			return;
		case "global":
			if (r.name !== CACHE_ARRAY || isCacheSlot(parent, key)) return;
			break;
		case "math":
			if (parent?.type === "MemberExpression" && key === "object" && !parent.computed) return;
			ctx.fail(node, "Math may only be used as Math.name");
			break;
		case "helper":
		case "intrinsic":
			if (parent?.type === "CallExpression" && key === "callee") return;
			ctx.fail(node, `'${r.name}' may only be called`);
			break;
		case "free":
			if (ctx.scopes.bindings.some((b) => b.name === r.name))
				ctx.fail(node, `'${r.name}' is used outside the block that declares it`);
	}
	ctx.fail(
		node,
		`'${node.name}' is not defined here — a tick may use only its parameters, its locals, Math, its helpers and hashRandom (no closures over patch or module variables)`,
	);
}

/** A `let` or `const` is in its temporal dead zone until its declaration ends. */
function checkDeclaredBefore(node: Identifier, binding: Binding, ctx: RuleContext): void {
	if (binding.kind === "param" || binding.kind === "var" || binding.declarator === null) return;
	if (node.start < binding.declarator.end)
		ctx.fail(node, `'${binding.name}' is used before its declaration`);
}

function isCacheSlot(parent: AnyNode | null, key: string | null): boolean {
	return key === "object" && parent !== null && cacheSlotOf(parent) !== null;
}
