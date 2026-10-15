/**
 * Which names code writes or reads, by name alone: a write is `=`, a
 * compound assignment or `++`/`--` on a plain name. Shadowing is not
 * followed, so a write to an inner variable of the same name counts: the
 * answer errs towards "written", which keeps a variable an f64.
 */

import type { AnyNode } from "acorn";
import { walk } from "../../module/tick-subset/walk";

export function writes(nodes: readonly (AnyNode | null | undefined)[], name: string): boolean {
	return some(nodes, (node) => {
		const target =
			node.type === "AssignmentExpression"
				? node.left
				: node.type === "UpdateExpression"
					? node.argument
					: null;
		return target?.type === "Identifier" && target.name === name;
	});
}

/** `name` appears as a name (not as a property after a dot). */
export function mentions(node: AnyNode, name: string): boolean {
	let found = false;
	walk(node, (n, parent, key) => {
		const property = parent?.type === "MemberExpression" && key === "property" && !parent.computed;
		if (n.type === "Identifier" && n.name === name && !property) found = true;
	});
	return found;
}

function some(
	nodes: readonly (AnyNode | null | undefined)[],
	test: (node: AnyNode) => boolean,
): boolean {
	let found = false;
	for (const root of nodes)
		if (root !== null && root !== undefined)
			walk(root, (node) => {
				if (!found && test(node)) found = true;
			});
	return found;
}
