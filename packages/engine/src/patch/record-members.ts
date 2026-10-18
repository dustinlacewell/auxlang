/**
 * Record outputs: a module that reads a pattern (`reads: "pattern"`: seq)
 * takes the members of its open output group from the pattern's record
 * fields (pattern/record-fields.ts), so `seq(p.with({ vel: q })).vel` is a
 * port. Its tick reads field k of its table into member k, so the members
 * are exactly the fields, in their order: set by hand they must match, and a
 * name that clashes with a port, config or handle name is a loud error
 * (bind-group.ts). A mini-notation string carries no records.
 */

import { type GroupDecl, openGroup } from "../dsp/group-decls";
import type { InputValue } from "../graph/node";
import type { Pat } from "../pattern/ast";
import { isP } from "../pattern/pat-class";
import { recordFields } from "../pattern/record-fields";
import type { ModulePorts } from "../types";
import { type BuildGroups, bindGroup } from "./bind-group";

/** Set the open output group's members from the node's `config.pattern`. */
export function bindRecordMembers(
	spec: ModulePorts,
	config: Readonly<Record<string, unknown>>,
	inputs: Record<string, InputValue>,
	groups: BuildGroups,
): void {
	const group = recordGroup(spec);
	if (group === undefined) return;
	const fields = recordFieldsOf(config.pattern);
	assertSame(spec, group.name, groups[group.name], fields);
	if (fields.length > 0) bindGroup(spec, group, [...fields], inputs, groups);
}

/** A built node's record members still match its prepared pattern's fields. */
export function assertRecordMembers(
	spec: ModulePorts,
	groups: Readonly<Record<string, readonly string[]>> | undefined,
	pattern: Pat,
): void {
	const group = recordGroup(spec);
	if (group !== undefined) assertSame(spec, group.name, groups?.[group.name], recordFields(pattern));
}

/** The group record fields fill, when the module reads a pattern. */
function recordGroup(spec: ModulePorts): GroupDecl | undefined {
	if ((spec as { readonly reads?: string }).reads !== "pattern") return undefined;
	return openGroup(spec, "outs");
}

function recordFieldsOf(pattern: unknown): readonly string[] {
	if (isP(pattern)) return recordFields(pattern.ast);
	if (isPatData(pattern)) return recordFields(pattern);
	return [];
}

function isPatData(value: unknown): value is Pat {
	return typeof value === "object" && value !== null && typeof (value as { op?: unknown }).op === "string";
}

function assertSame(
	spec: ModulePorts,
	group: string,
	members: readonly string[] | undefined,
	fields: readonly string[],
): void {
	if (members === undefined || members.join(",") === fields.join(",")) return;
	throw new Error(
		`${spec.name}: output group '${group}' takes its members from the pattern's record fields ` +
			`[${fields.join(", ")}], not [${members.join(", ")}]`,
	);
}
