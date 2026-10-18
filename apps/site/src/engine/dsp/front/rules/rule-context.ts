/**
 * What the rules know about the one function they are walking: its kind,
 * its resolved names, the role of each parameter binding, the module's port
 * names and the fresh state shape writes are checked against.
 */

import type { AnyNode, Identifier } from "acorn";
import type { Fail } from "@/engine/dsp/front/parse/parse-part";
import type { Binding, Resolution, Scopes } from "@/engine/dsp/front/scope/binding";
import type { WriteSites } from "@/engine/dsp/front/scope/writes";

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
	/** In-port names that are port groups. */
	readonly inGroups: ReadonlySet<string>;
	/** Out-port names that are port groups. */
	readonly outGroups: ReadonlySet<string>;
	/** A fresh state with the engine-injected fields, as the tick will see it. */
	readonly state: Record<string, unknown>;
	/** The module declares `reads: "pattern"`: its tick may call the table intrinsics. */
	readonly tables: boolean;
	/** Every binding's assignment/update sites, for a rule that needs "never reassigned". */
	readonly writes: WriteSites;
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
