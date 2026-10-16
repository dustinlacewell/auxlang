/**
 * Binding a user value to a named input port: a unit tag converts to the
 * port's unit; anything else lifts as-is (an untagged value means the port's
 * unit and is never rejected for it).
 */

import { type NodeGroups, nodePorts } from "@/core3/module/node-ports";
import type { InputValue } from "../graph/node";
import type { ModulePorts, PortAnn } from "../types";
import { isUnitTag } from "../units/tag";
import { convertTag } from "./convert-tag";
import { lift } from "./lift";

/** `groups` are the node's port group members, so a member port binds by its group's unit. */
export function bindInput(
	spec: ModulePorts,
	port: string,
	value: unknown,
	groups?: NodeGroups,
): InputValue {
	return bindValue(`${spec.name}.${port}`, () => nodePorts(spec, groups).ins[port] as PortAnn, value);
}

/** `ann` is read only for a unit tag. */
export function bindValue(where: string, ann: () => PortAnn, value: unknown): InputValue {
	if (isUnitTag(value)) return convertTag(value, ann(), where);
	return lift(value, where);
}
