/**
 * Ambient clock resolution: any node declaring a `clk` input with unit "phase"
 * (a beat-domain consumer — seq) that is left unconnected gets the eval's
 * ambient clock. A beat-domain consumer with no clock anywhere is a loud
 * error — it could never sound. Mirrors expand-patterns' patsig wiring.
 */

import type { GNode } from "../graph/node";
import { getModule } from "../module/define";

export function resolveAmbientClocks(nodes: readonly GNode[], clockNode: GNode | null): void {
	for (const node of nodes) {
		const ann = getModule(node.module).ins.clk;
		if (ann === undefined || ann.unit !== "phase") continue;
		if (node.inputs.clk !== undefined) continue;
		if (clockNode === null) {
			throw new Error(
				`${node.module} has no clock — call clock(bpm) in the eval first or connect 'clk' explicitly`,
			);
		}
		if (!("phase" in getModule(clockNode.module).outs)) {
			throw new Error(`ambient clock module '${clockNode.module}' has no 'phase' output`);
		}
		node.inputs.clk = { node: clockNode, port: "phase" };
	}
}
