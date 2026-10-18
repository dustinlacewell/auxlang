/**
 * Ambient clock resolution: any input with unit "phase" left unconnected (a
 * seq's position, a tempo converter's clk) gets the eval's ambient clock's
 * position output. A beat-domain consumer with no clock anywhere is a loud
 * error — it could never move.
 */

import { nodePorts } from "../dsp/node-ports";
import type { GNode } from "../graph/node";
import { defaultOutOf } from "../dsp/default-out";
import { getModule } from "../dsp/define";
import { type SpecTable, resolveSpec } from "../dsp/resolve";

export function resolveAmbientClocks(
	nodes: readonly GNode[],
	clockNode: GNode | null,
	specs?: SpecTable,
): void {
	for (const node of nodes) {
		for (const [port, ann] of Object.entries(nodePorts(resolveSpec(node.module, specs), node.groups).ins)) {
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
	return { node: clockNode, port: defaultOutOf(getModule(clockNode.module), `${module}.${port}`) };
}
