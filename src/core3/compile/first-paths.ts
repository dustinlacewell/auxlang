/**
 * Each reachable node's first path from an `out` root: the (input port,
 * module) hops walked to reach it. Breadth-first from the roots in root
 * order, ports in name order, z-edges included, so a node with several paths
 * gets the shortest, and among those the first in that order. The path names
 * module types only — never constants, config or patch-defined source — so
 * a constant edit or rewiring elsewhere leaves a node's path alone.
 *
 * A hop into or out of a sub-patch instance also names the scopes crossed
 * (compile/scope-crossing), so an inner node's path nests under the place the
 * instance would have as a module, and a constant edit inside it keeps it.
 */

import { isNodeRef, isZRef } from "../graph/input-kinds";
import type { GNode, InputValue } from "../graph/node";
import { scopeCrossing } from "./scope-crossing";

export function firstPaths(roots: readonly GNode[]): Map<GNode, string> {
	const paths = new Map<GNode, string>();
	const queue: [GNode, string][] = roots.map((root) => [root, root.module]);
	for (let i = 0; i < queue.length; i++) {
		const [node, path] = queue[i] as [GNode, string];
		if (paths.has(node)) continue;
		paths.set(node, path);
		for (const port of Object.keys(node.inputs).sort()) {
			const source = sourceNode(node.inputs[port]);
			if (source !== undefined) queue.push([source, `${path}/${port}<${hop(node, source)}`]);
		}
	}
	return paths;
}

function hop(consumer: GNode, source: GNode): string {
	return `${scopeCrossing(consumer.scope, source.scope)}${source.module}`;
}

function sourceNode(value: InputValue | undefined): GNode | undefined {
	if (isNodeRef(value)) return value.node;
	if (isZRef(value)) return value.z.node;
	return undefined;
}
