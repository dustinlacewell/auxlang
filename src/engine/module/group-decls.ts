/**
 * A module's port group declarations: which `ins`/`outs` entries are groups,
 * and the open group of a side. Read by the patch layer to bind members and by
 * `validateGroups` to check the declarations once, at definition.
 */

import type { ModulePorts, PortGroup } from "@/engine/types";

export type Side = "ins" | "outs";

export interface GroupDecl {
	readonly name: string;
	readonly side: Side;
	readonly decl: PortGroup;
}

/** The group named `name`, on either side; undefined when `name` is not a group. */
export function groupDecl(spec: Pick<ModulePorts, "ins" | "outs">, name: string): GroupDecl | undefined {
	for (const side of ["ins", "outs"] as const) {
		const decl = Object.hasOwn(spec[side], name) ? spec[side][name]?.group : undefined;
		if (decl !== undefined) return { name, side, decl };
	}
	return undefined;
}

/** Every group of one side, in declaration order. */
export function groupDecls(spec: Pick<ModulePorts, "ins" | "outs">, side: Side): GroupDecl[] {
	return Object.entries(spec[side]).flatMap(([name, ann]) =>
		ann.group === undefined ? [] : [{ name, side, decl: ann.group }],
	);
}

/** The side's open group (at most one, checked at definition). */
export function openGroup(spec: Pick<ModulePorts, "ins" | "outs">, side: Side): GroupDecl | undefined {
	return groupDecls(spec, side).find((g) => g.decl.open === true);
}
