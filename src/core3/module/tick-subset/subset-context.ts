/**
 * What the rule checks know about the one function they are walking: its
 * kind, the role of each parameter, its locals, the module's helpers and port
 * names, and the fresh state shape writes are checked against.
 */

import type { AnyNode } from "acorn";

export type FunctionKind = "tick" | "helper" | "lambda";

/** Parameter names by role. A helper has no roles; its parameters are plain values. */
export interface ParamRoles {
	readonly state?: string;
	readonly ins?: string;
	readonly outs?: string;
	readonly config?: string;
}

export interface SubsetContext {
	readonly kind: FunctionKind;
	readonly params: ReadonlySet<string>;
	readonly locals: ReadonlySet<string>;
	readonly roles: ParamRoles;
	readonly helpers: ReadonlySet<string>;
	readonly ins: ReadonlySet<string>;
	readonly outs: ReadonlySet<string>;
	/** A fresh state with the engine-injected fields, as the tick will see it. */
	readonly state: Record<string, unknown>;
	/** Throws the located violation for `node`. */
	readonly fail: (node: AnyNode, message: string) => never;
	/** Helper calls seen, for the recursion check. */
	readonly calls: { readonly name: string; readonly node: AnyNode }[];
}

export function isBound(ctx: SubsetContext, name: string): boolean {
	return ctx.params.has(name) || ctx.locals.has(name);
}
