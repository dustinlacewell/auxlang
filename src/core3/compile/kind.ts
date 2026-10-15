/**
 * A node's kind: its module type. A patch-defined (defmod) module also folds
 * in a hash of its tick and state source, so a changed tick is a different
 * machine and never takes the old one's state (MANIFESTO §6.2).
 */

import type { GNode } from "../graph/node";
import { fnv1aHex } from "../hash/fnv1a-hex";
import type { SpecTable } from "../module/resolve";

export function kindOf(node: GNode, specs: SpecTable): string {
	const spec = specs.get(node.module);
	if (spec === undefined) return node.module;
	return `${node.module}#${fnv1aHex(spec.tick.toString() + (spec.state?.toString() ?? ""))}`;
}
