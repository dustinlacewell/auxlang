/** `Math.name`: the one method call a tick may make, and one that never builds a module. */

import type { AnyNode } from "acorn";

export function isMathMember(node: AnyNode): boolean {
	return (
		node.type === "MemberExpression" &&
		!node.computed &&
		node.object.type === "Identifier" &&
		node.object.name === "Math"
	);
}
