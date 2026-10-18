/**
 * A port group's view at run: one Float64Array, one slot per member, in the
 * group's index order. Split into in-groups and out-groups by the spec side
 * the group name declares on, built once at build-run so the tick loop
 * (interpret-sample.ts) only copies into/out of a preallocated buffer.
 */

import type { ModuleSpec } from "../types";
import type { GroupPorts } from "../dsp/node-ports";

export interface GroupView {
	readonly name: string;
	readonly ports: readonly string[];
	readonly view: Float64Array;
}

export interface NodeGroupViews {
	readonly ins: readonly GroupView[];
	readonly outs: readonly GroupView[];
}

const NO_GROUPS: NodeGroupViews = { ins: [], outs: [] };

export function groupViews(
	spec: Pick<ModuleSpec, "ins" | "outs">,
	groups: GroupPorts,
): NodeGroupViews {
	const names = Object.keys(groups);
	if (names.length === 0) return NO_GROUPS;
	const ins: GroupView[] = [];
	const outs: GroupView[] = [];
	for (const name of names) {
		const ports = groups[name] as readonly string[];
		const view: GroupView = { name, ports, view: new Float64Array(ports.length) };
		if (Object.hasOwn(spec.ins, name)) ins.push(view);
		else outs.push(view);
	}
	return { ins, outs };
}
