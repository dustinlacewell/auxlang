/**
 * Each reachable node's first path from an `out` root: the (input port,
 * module) hops walked to reach it. Breadth-first from the roots in root
 * order, ports in name order, z-edges included, so a node with several paths
 * gets the shortest, and among those the first in that order. The path names
 * module types only — never constants, config or patch-defined source — so
 * a constant edit or rewiring elsewhere leaves a node's path alone. A port
 * group member hops by its group's name (compile/port-hop).
 *
 * A hop into or out of a sub-patch instance also names the scopes crossed
 * (compile/scope-crossing), so an inner node's path nests under the place the
 * instance would have as a module, and a constant edit inside it keeps it.
 * A pinned instance's inner paths start at its pin instead.
 */

import { isNodeRef, isZRef } from "../graph/input-kinds";
import type { GNode, InputValue } from "../graph/node";
import type { PortHop } from "./port-hop";
import { hopPath } from "./scope-crossing";

export function firstPaths(roots: readonly GNode[], hopOf: PortHop): Map<GNode, string> {
	const paths = new Map<GNode, string>();
	const queue: [GNode, string][] = roots.map((root) => [root, root.module]);
	for (let i = 0; i < queue.length; i++) {
		const [node, path] = queue[i] as [GNode, string];
		if (paths.has(node)) continue;
		paths.set(node, path);
		for (const [hop, port] of hopsInOrder(node, hopOf)) {
			const source = sourceNode(node.inputs[port]);
			if (source === undefined) continue;
			queue.push([source, hopPath(path, hop, node.scope, source.scope, source.module)]);
		}
	}
	return paths;
}

/** (hop, port) pairs, by hop then port: a node without port groups walks its ports in name order. */
function hopsInOrder(node: GNode, hopOf: PortHop): [string, string][] {
	const pairs = Object.keys(node.inputs).map((port): [string, string] => [hopOf(node, port), port]);
	return pairs.sort(([ha, pa], [hb, pb]) => (ha !== hb ? (ha < hb ? -1 : 1) : pa < pb ? -1 : pa > pb ? 1 : 0));
}

function sourceNode(value: InputValue | undefined): GNode | undefined {
	if (isNodeRef(value)) return value.node;
	if (isZRef(value)) return value.z.node;
	return undefined;
}
