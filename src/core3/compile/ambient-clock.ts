/**
 * Ambient clock resolution: any input with unit "phase" left unconnected (a
 * seq's position, a tempo converter's clk) gets the eval's ambient clock's
 * position output. A beat-domain consumer with no clock anywhere is a loud
 * error — it could never move.
 */

import type { GNode } from "../graph/node";
import { getModule } from "../module/define";
import { type SpecTable, resolveSpec } from "../module/resolve";

export function resolveAmbientClocks(
	nodes: readonly GNode[],
	clockNode: GNode | null,
	specs?: SpecTable,
): void {
	for (const node of nodes) {
		for (const [port, ann] of Object.entries(resolveSpec(node.module, specs).ins)) {
			if (ann.unit !== "phase" || node.inputs[port] !== undefined) continue;
			node.inputs[port] = ambientPosition(clockNode, node.module, port);
		}
	}
}

function ambientPosition(clockNode: GNode | null, module: string, port: string) {
	if (clockNode === null) {
		throw new Error(
			`${module} has no clock — set one with tempo(bpm) or connect '${port}' explicitly`,
		);
	}
	return { node: clockNode, port: getModule(clockNode.module).defaultOut };
}
