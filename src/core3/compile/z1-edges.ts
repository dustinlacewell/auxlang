/**
 * z1 edge cutting: every connection INTO a z1 node reads one sample late.
 * Converting the NodeRef to a ZRef here (before toposort) is what makes z1 a
 * real unit delay — its tick is a passthrough — and what lets any cycle
 * through z1 topo-sort, whether built by `loop()` (already a ZRef) or by a
 * hand-chained `.z1()`.
 */

import { isNodeRef } from "../graph/input-kinds";
import type { GNode } from "../graph/node";

export function cutZ1Edges(nodes: readonly GNode[]): void {
	for (const node of nodes) {
		if (node.module !== "z1") continue;
		const value = node.inputs.in;
		if (isNodeRef(value)) node.inputs.in = { z: { node: value.node, port: value.port } };
	}
}
