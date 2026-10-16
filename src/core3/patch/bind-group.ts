/**
 * Binding values to a node's port groups (module/node-ports). An in-group key
 * takes an object (members by key) or an array (members `0..n-1`); an
 * out-group key takes a list of member names, which replaces its members. A
 * named argument that is no port or config is a member of the open in-group
 * (`bindOpenMember`). New members append in the order they are set; a `like`
 * group's members are its target's, checked once the node is complete
 * (`assertGroupPorts`).
 */

import { type GroupDecl, groupDecl, openGroup } from "@/core3/module/group-decls";
import { memberPort, nodePorts } from "@/core3/module/node-ports";
import type { InputValue } from "../graph/node";
import type { ModulePorts, PortAnn } from "../types";
import { bindValue } from "./bind-input";
import { isNamedArgs } from "./is-named-args";
import { RESERVED_HANDLE_NAMES } from "./reserved-handle-names";

/** A node's group members while it is built; arrays are replaced, never changed. */
export type BuildGroups = Record<string, readonly string[]>;

export function bindGroup(
	spec: ModulePorts,
	group: GroupDecl,
	value: unknown,
	inputs: Record<string, InputValue>,
	groups: BuildGroups,
): void {
	if (group.side === "outs") {
		setOutMembers(spec, group, value, groups);
		return;
	}
	for (const [member, v] of memberEntries(spec, group, value)) {
		bindMember(spec, group, member, v, inputs, groups);
	}
}

/** `key` is a member of the open in-group; false when the module has none. */
export function bindOpenMember(
	spec: ModulePorts,
	key: string,
	value: unknown,
	inputs: Record<string, InputValue>,
	groups: BuildGroups,
): boolean {
	const open = openGroup(spec, "ins");
	if (open === undefined) return false;
	bindMember(spec, open, key, value, inputs, groups);
	return true;
}

/** Every bound input is a port of the node: a `like` member names a member of its target. */
export function assertGroupPorts(
	spec: ModulePorts,
	inputs: Readonly<Record<string, InputValue>>,
	groups: BuildGroups,
): void {
	const ports = nodePorts(spec, groups);
	if (Object.keys(ports.groups).length === 0) return;
	for (const port of Object.keys(inputs)) {
		if (port in ports.ins) continue;
		throw new Error(
			`${spec.name}: '${port}' is not a port of this node. ` +
				`inputs: [${Object.keys(ports.ins).join(", ")}]${likeHint(spec, port)}`,
		);
	}
}

function bindMember(
	spec: ModulePorts,
	group: GroupDecl,
	member: string,
	value: unknown,
	inputs: Record<string, InputValue>,
	groups: BuildGroups,
): void {
	if (group.decl.like === undefined) addMember(spec, group, member, groups);
	else assertMemberName(spec, group, member);
	const port = memberPort(group.name, group.decl, member);
	inputs[port] = bindValue(`${spec.name}.${port}`, () => spec.ins[group.name] as PortAnn, value);
}

function memberEntries(spec: ModulePorts, group: GroupDecl, value: unknown): [string, unknown][] {
	if (Array.isArray(value)) return value.map((v, i) => [String(i), v]);
	if (isNamedArgs(value)) return Object.entries(value);
	throw new Error(
		`${spec.name}: port group '${group.name}' takes an object of members or an array, ` +
			`not ${describe(value)}. Example: ${group.name}: { a: x, b: y } or ${group.name}: [x, y]`,
	);
}

function setOutMembers(spec: ModulePorts, group: GroupDecl, value: unknown, groups: BuildGroups): void {
	if (group.decl.like !== undefined) {
		throw new Error(
			`${spec.name}: output group '${group.name}' takes the members of '${group.decl.like}'; it is not set`,
		);
	}
	if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
		throw new Error(
			`${spec.name}: output group '${group.name}' takes a list of member names, not ${describe(value)}`,
		);
	}
	const names = value as string[];
	for (const [i, name] of names.entries()) {
		assertMemberName(spec, group, name);
		if (names.indexOf(name) !== i) {
			throw new Error(`${spec.name}: output group '${group.name}' names '${name}' twice`);
		}
	}
	groups[group.name] = [...names];
}

function addMember(spec: ModulePorts, group: GroupDecl, member: string, groups: BuildGroups): void {
	assertMemberName(spec, group, member);
	const members = groups[group.name] ?? [];
	if (!members.includes(member)) groups[group.name] = [...members, member];
}

/** A member name is a non-empty string without `.`; an open group's member also clashes with nothing. */
function assertMemberName(spec: ModulePorts, group: GroupDecl, member: string): void {
	if (member.length === 0 || member.includes(".")) {
		throw new Error(`${spec.name}: '${member}' is not a member name of port group '${group.name}' (no '.', not empty)`);
	}
	if (!group.decl.open) return;
	const taken =
		RESERVED_HANDLE_NAMES.has(member) ||
		Object.hasOwn(spec.ins, member) ||
		Object.hasOwn(spec.outs, member) ||
		Object.hasOwn(spec.config ?? {}, member);
	if (taken) {
		throw new Error(
			`${spec.name}: member '${member}' of open port group '${group.name}' clashes with a port, ` +
				`config or handle name of '${spec.name}'`,
		);
	}
}

function likeHint(spec: ModulePorts, port: string): string {
	const dot = port.indexOf(".");
	const group = dot < 0 ? undefined : groupDecl(spec, port.slice(0, dot));
	const like = group?.decl.like;
	if (like === undefined) return "";
	return `. Port group '${group?.name}' takes the members of '${like}'; '${port.slice(dot + 1)}' is not one`;
}

function describe(value: unknown): string {
	if (typeof value === "function") return "a signal";
	return typeof value === "object" && value !== null ? "a signal or pattern" : JSON.stringify(value);
}
