/**
 * The displays the monitor copies a buffer from (live-contract.ts
 * `DisplayWatch`): every node whose module declares `display`
 * (ModuleSpec.display), in node order. Pure: the worklet and the editor both
 * call it on the same Program, so a display index means the same node on
 * both sides.
 */

import { getRegistry } from "../../dsp/define";
import type { Program, Registry } from "../../types";
import { withProgramSpecs } from "../hydrate-specs";
import type { DisplayWatch } from "./live-contract";

export function displayList(
	program: Program,
	registry: Registry = withProgramSpecs(getRegistry(), program),
): readonly DisplayWatch[] {
	return program.nodes.flatMap((node, i) => {
		const display = registry.get(node.module)?.display;
		if (node.site === undefined || display === undefined || node.lanes.length === 0) return [];
		return [
			{
				node: i,
				site: node.site,
				module: node.module,
				kind: display.kind,
				lanes: node.lanes.length,
				config: node.config,
			},
		];
	});
}
