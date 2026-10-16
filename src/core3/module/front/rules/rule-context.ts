/**
 * What the rules know about the one function they are walking: its kind,
 * its resolved names, the role of each parameter binding, the module's port
 * names and the fresh state shape writes are checked against.
 */

import type { AnyNode, Identifier } from "acorn";
import type { Fail } from "@/core3/module/front/parse/parse-part";
import type { Binding, Resolution, Scopes } from "@/core3/module/front/scope/binding";

export type FunctionKind = "tick" | "helper" | "lambda";

/** What a parameter receives: the tick's records. A helper's plain-value parameters have no role. */
export type Role = "state" | "ins" | "outs" | "config";

export interface HelperCallSite {
	readonly name: string;
	readonly node: AnyNode;
}

export interface RuleContext {
	readonly kind: FunctionKind;
	readonly scopes: Scopes;
	readonly roles: ReadonlyMap<Binding, Role>;
	readonly helpers: ReadonlySet<string>;
	readonly ins: ReadonlySet<string>;
	readonly outs: ReadonlySet<string>;
	/** A fresh state with the engine-injected fields, as the tick will see it. */
	readonly state: Record<string, unknown>;
	/** The module declares `reads: "pattern"`: its tick may call the table intrinsics. */
	readonly tables: boolean;
	readonly fail: Fail;
	/** Helper calls seen, for the recursion check. */
	readonly calls: HelperCallSite[];
}

/** What a referencing identifier names; undefined for a property name, declared name or label. */
export function resolutionOf(ctx: RuleContext, node: Identifier): Resolution | undefined {
	return ctx.scopes.references.get(node);
}

/** The role of the parameter `node` names, when `node` is a reference to one. */
export function roleOf(ctx: RuleContext, node: AnyNode): Role | undefined {
	if (node.type !== "Identifier") return undefined;
	const r = resolutionOf(ctx, node);
	return r?.k === "binding" ? ctx.roles.get(r.binding) : undefined;
}

export function hasRole(ctx: RuleContext, role: Role): boolean {
	for (const r of ctx.roles.values()) if (r === role) return true;
	return false;
}
