/**
 * The ports one node has. Every consumer that needs a node's inputs or
 * outputs asks here, not the module's `ins`/`outs`: a node fixes its port
 * group members at eval, so its ports can differ from its module's. With no
 * groups the node's ports are the module's lists, unchanged.
 */

import type { ModulePorts, PortAnn } from "@/core3/types";

/** Group name -> member port names, in index order. */
export type NodeGroups = Readonly<Record<string, readonly string[]>>;

export interface NodePorts {
	readonly ins: Readonly<Record<string, PortAnn>>;
	readonly outs: Readonly<Record<string, PortAnn>>;
	readonly groups: NodeGroups;
}

const NO_GROUPS: NodeGroups = {};

export function nodePorts(
	spec: Pick<ModulePorts, "ins" | "outs">,
	groups: NodeGroups = NO_GROUPS,
): NodePorts {
	return { ins: spec.ins, outs: spec.outs, groups };
}
