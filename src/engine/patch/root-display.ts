/**
 * A module declaring `display` (ModuleSpec.display) always runs, whether or
 * not it reaches `out()`: it joins the eval's `kept` list (compile walks
 * reachability from it, but it never reaches the master bus — context.ts).
 * Its open input group's members are the display's extra traces (trace 0 is
 * the default input); more members than the display has room for is a loud
 * error naming the module, the count and the limit.
 */

import { openGroup } from "@/engine/module/group-decls";
import type { GNode } from "../graph/node";
import type { DisplayDecl, ModulePorts } from "../types";
import { evalCtx } from "./context";

export function rootDisplay(spec: ModulePorts & { readonly display?: DisplayDecl }, node: GNode): void {
	const display = spec.display;
	if (display === undefined) return;

	const group = openGroup(spec, "ins");
	const members = group !== undefined ? (node.groups?.[group.name] ?? []) : [];
	const limit = display.traces - 1;
	if (members.length > limit) {
		throw new Error(
			`${spec.name}: display '${display.kind}' holds ${display.traces} traces (trace 0 is 'in'), ` +
				`but got ${members.length} extra member(s) — at most ${limit}`,
		);
	}

	evalCtx(`${spec.name}(...)`).kept.push(node);
}
