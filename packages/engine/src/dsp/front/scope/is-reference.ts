/**
 * Whether an identifier, under `key` in `parent`, names a value: not a
 * property name (`o.out`), a declared name (`let x`) or a label.
 */

import type { AnyNode } from "acorn";

export function isReference(parent: AnyNode | null, key: string | null): boolean {
	if (parent === null) return true;
	if (parent.type === "MemberExpression" && key === "property") return parent.computed;
	if (parent.type === "VariableDeclarator" && key === "id") return false;
	if (parent.type === "Property" && key === "key") return parent.computed;
	if (key === "label") return false;
	return true;
}
