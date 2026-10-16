/**
 * What a name in one function means. Every reference resolves through the
 * block scopes around it: to a binding (a parameter or a declared variable),
 * or, unbound, to a global constant, a helper, an intrinsic, `Math`, or
 * nothing (`free`, which the name rule rejects).
 */

import type { Identifier, VariableDeclarator } from "acorn";

export type BindingKind = "param" | "let" | "const" | "var";

export interface Binding {
	readonly name: string;
	readonly kind: BindingKind;
	/** The declaring identifier: the parameter, or the declarator's id. */
	readonly id: Identifier;
	/** The declarator, for a variable; null for a parameter. */
	readonly declarator: VariableDeclarator | null;
}

export type Resolution =
	| { readonly k: "binding"; readonly binding: Binding }
	/** `undefined`, `NaN`, `Infinity`, and the bound math cache `__mc`. */
	| { readonly k: "global"; readonly name: string }
	| { readonly k: "helper"; readonly name: string }
	/** `hashRandom` and the table intrinsics. */
	| { readonly k: "intrinsic"; readonly name: string }
	| { readonly k: "math" }
	| { readonly k: "free"; readonly name: string };

export interface Scopes {
	/** Each parameter's binding, by position; undefined for a parameter that is not a plain name. */
	readonly params: readonly (Binding | undefined)[];
	/** Every binding the function declares, parameters first. */
	readonly bindings: readonly Binding[];
	/** Each reference (not a declaration, property name or label) to what it names. */
	readonly references: ReadonlyMap<Identifier, Resolution>;
}

/** The binding `node` names, when it is a reference to one. */
export function bindingOf(scopes: Scopes, node: Identifier): Binding | undefined {
	const r = scopes.references.get(node);
	return r?.k === "binding" ? r.binding : undefined;
}
