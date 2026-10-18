/**
 * Clocked-ness is static (bridge card): a seq whose position is wired
 * straight to a clock's position output is clocked, and dips its gate before
 * a change instead of after it. Runs after ambient-clock resolution, so the
 * default position counts as clocked.
 */

import { isNodeRef } from "../graph/input-kinds";
import type { GNode } from "../graph/node";
import { getModule } from "../dsp/define";

export function markClocked(nodes: readonly GNode[]): void {
	for (const node of nodes) {
		if (node.module !== "seq") continue;
		node.config = { ...node.config, clocked: fromClock(node) ? 1 : 0 };
	}
}

function fromClock(node: GNode): boolean {
	const position = node.inputs.position;
	if (!isNodeRef(position) || position.node.module !== "clock") return false;
	return position.port === getModule("clock").defaultOut;
}
