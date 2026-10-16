/**
 * The outputs the monitor summarises (live-contract.ts `Watch`): every node
 * the patch's code made (it has a site), its module's default output, lane
 * 0, in node order. A node with no default output (a stereo module) or no
 * lanes is not watched. Pure: the worklet and the editor both call it on
 * the same Program, so a watch index means the same output on both sides.
 */

import { getRegistry } from "../../module/define";
import type { Program, Registry } from "../../types";
import { withProgramSpecs } from "../hydrate-specs";
import type { Watch } from "./live-contract";

export function watchList(
	program: Program,
	registry: Registry = withProgramSpecs(getRegistry(), program),
): readonly Watch[] {
	return program.nodes.flatMap((node, i) => {
		const port = registry.get(node.module)?.defaultOut;
		if (node.site === undefined || port === undefined || node.lanes.length === 0) return [];
		return [{ node: i, port, site: node.site, module: node.module }];
	});
}
