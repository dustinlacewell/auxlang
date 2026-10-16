/**
 * The ports one node has. Every consumer that needs a node's inputs or
 * outputs asks here, not the module's `ins`/`outs`: a node fixes its port
 * group members at eval, so its ports can differ from its module's. With no
 * groups the node's ports are the module's lists, unchanged.
 *
 * A group expands in place into one port per member, each with the group's
 * annotation minus `group`: `name.member`, or the bare member in an `open`
 * group. A `like` group takes the members of the group it names.
 */

import type { ModulePorts, PortAnn, PortGroup } from "@/core3/types";

/** Group name -> member names, in index order (GNode/PNode `groups`). */
export type NodeGroups = Readonly<Record<string, readonly string[]>>;

/** Group name -> member PORT names, in index order; every group, `like` ones too. */
export type GroupPorts = Readonly<Record<string, readonly string[]>>;

export interface NodePorts {
	readonly ins: Readonly<Record<string, PortAnn>>;
	readonly outs: Readonly<Record<string, PortAnn>>;
	readonly groups: GroupPorts;
}

const NO_GROUPS: NodeGroups = {};

export function nodePorts(
	spec: Pick<ModulePorts, "ins" | "outs">,
	groups: NodeGroups = NO_GROUPS,
): NodePorts {
	if (!declaresGroups(spec)) return { ins: spec.ins, outs: spec.outs, groups: NO_GROUPS };
	const groupPorts: Record<string, readonly string[]> = {};
	const ins = expandSide(spec.ins, groups, groupPorts);
	const outs = expandSide(spec.outs, groups, groupPorts);
	return { ins, outs, groups: groupPorts };
}

/** A member's port name. */
export function memberPort(group: string, decl: PortGroup, member: string): string {
	return decl.open ? member : `${group}.${member}`;
}

function declaresGroups(spec: Pick<ModulePorts, "ins" | "outs">): boolean {
	for (const ann of Object.values(spec.ins)) if (ann.group !== undefined) return true;
	for (const ann of Object.values(spec.outs)) if (ann.group !== undefined) return true;
	return false;
}

function expandSide(
	anns: Readonly<Record<string, PortAnn>>,
	groups: NodeGroups,
	groupPorts: Record<string, readonly string[]>,
): Record<string, PortAnn> {
	const ports: Record<string, PortAnn> = {};
	for (const [name, ann] of Object.entries(anns)) {
		const { group: decl, ...memberAnn } = ann;
		if (decl === undefined) {
			ports[name] = ann;
			continue;
		}
		const names = (groups[decl.like ?? name] ?? []).map((m) => memberPort(name, decl, m));
		for (const port of names) ports[port] = memberAnn;
		groupPorts[name] = names;
	}
	return ports;
}
