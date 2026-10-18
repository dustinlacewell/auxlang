/**
 * Binding a user value to a named input port: a unit tag converts to the
 * port's unit; a note-name string ("c4") converts as if it were `semis(60)`;
 * anything else lifts as-is (an untagged value means the port's unit and is
 * never rejected for it).
 */

import { type NodeGroups, nodePorts } from "@/engine/dsp/node-ports";
import type { InputValue } from "../graph/node";
import type { ModulePorts, PortAnn } from "../types";
import { noteNameToSemis } from "../units/note-name";
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

/** `ann` is read only for a unit tag (or a note-name string, which becomes one). */
export function bindValue(where: string, ann: () => PortAnn, value: unknown): InputValue {
	if (isUnitTag(value)) return convertTag(value, ann(), where);
	if (typeof value === "string") {
		return convertTag({ unit: "semis", def: noteName(value, where) }, ann(), where);
	}
	return lift(value, where);
}

function noteName(text: string, where: string): number {
	const n = noteNameToSemis(text);
	if (n === undefined) {
		throw new Error(
			`${where}: "${text}" is not a note name (like "c4" or "f#3"). For a pattern, use p\`...\`.`,
		);
	}
	return n;
}
