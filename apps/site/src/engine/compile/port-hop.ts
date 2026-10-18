/**
 * A port's identity hop (D2 on the per-node ports card): a port group
 * member hops by its group's name, so renaming, reordering, adding or
 * removing a member keeps every upstream node's place. Any other port hops
 * by its own name. Read by `firstPaths` and `upstreamSignatures`.
 */

import type { GNode } from "../graph/node";
import { nodePorts } from "../dsp/node-ports";
import { resolveSpec, type SpecTable } from "../dsp/resolve";

export type PortHop = (node: GNode, port: string) => string;

export function portHops(specs?: SpecTable): PortHop {
	const groupOf = new Map<GNode, ReadonlyMap<string, string>>();
	return (node, port) => {
		if (node.groups === undefined) return port;
		let ports = groupOf.get(node);
		if (ports === undefined) {
			ports = memberGroups(node, specs);
			groupOf.set(node, ports);
		}
		return ports.get(port) ?? port;
	};
}

function memberGroups(node: GNode, specs: SpecTable | undefined): ReadonlyMap<string, string> {
	const groups = nodePorts(resolveSpec(node.module, specs), node.groups).groups;
	return new Map(
		Object.entries(groups).flatMap(([group, ports]) => ports.map((port) => [port, group] as const)),
	);
}
