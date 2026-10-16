/**
 * Definition checks for port groups (module/node-ports). Loud at defmod:
 * groups on a reduce module, more than one open group on a side, a group
 * name on both sides, and a `like` that names no plain group on its side.
 */

import type { ModulePorts } from "@/core3/types";
import { groupDecl, groupDecls, type Side } from "./group-decls";

export function validateGroups(spec: ModulePorts & { readonly policy?: "map" | "reduce" }): void {
	const all = [...groupDecls(spec, "ins"), ...groupDecls(spec, "outs")];
	if (all.length === 0) return;
	const fail = (what: string) => new Error(`module '${spec.name}': ${what}`);
	if (spec.policy === "reduce") {
		throw fail(`port group '${all[0]?.name}' on a reduce module. A reduce module takes no port groups.`);
	}
	for (const side of ["ins", "outs"] as const) assertOneOpen(spec, side, fail);
	for (const { name, side, decl } of all) {
		const other: Side = side === "ins" ? "outs" : "ins";
		if (Object.hasOwn(spec[other], name)) throw fail(`port group '${name}' is both an input and an output`);
		if (decl.like === undefined) continue;
		if (decl.open) throw fail(`port group '${name}' is both open and like '${decl.like}'`);
		const target = groupDecl(spec, decl.like);
		if (target === undefined || target.side !== side || target.decl.like !== undefined) {
			throw fail(`port group '${name}' is like '${decl.like}', which is not a plain port group of its ${side}`);
		}
	}
}

function assertOneOpen(spec: ModulePorts, side: Side, fail: (what: string) => Error): void {
	const open = groupDecls(spec, side).filter((g) => g.decl.open === true);
	if (open.length > 1) {
		throw fail(`more than one open port group in ${side}: [${open.map((g) => g.name).join(", ")}]`);
	}
}
