/**
 * Depth-first walk over an ESTree subtree, parent first. Each visit sees the
 * node, its parent, and the key it sits under in the parent (`callee`,
 * `property`, ...), which is what tells a reference from a property name.
 */

import type { AnyNode } from "acorn";

export type Visit = (node: AnyNode, parent: AnyNode | null, key: string | null) => void;

const SKIP = new Set(["type", "start", "end", "loc", "range"]);

export function walk(
	node: AnyNode,
	visit: Visit,
	parent: AnyNode | null = null,
	key: string | null = null,
): void {
	visit(node, parent, key);
	for (const [childKey, value] of Object.entries(node)) {
		if (SKIP.has(childKey)) continue;
		if (Array.isArray(value)) {
			for (const item of value) if (isNode(item)) walk(item, visit, node, childKey);
		} else if (isNode(value)) {
			walk(value, visit, node, childKey);
		}
	}
}

function isNode(value: unknown): value is AnyNode {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string"
	);
}
