/**
 * Seq preparation: every seq node's `pattern` config (a mini-notation string,
 * `p` pattern, or Pat data, as the user passed it) becomes voiced Pat data
 * with its lane count, width hint, and the program seed (bridge/seq-config).
 * Runs before width resolution, for seqs built by the user and by pattern
 * lifting alike. A bad pattern is a loud error naming seq.
 */

import { seqConfig } from "../bridge/seq-config";
import type { GNode } from "../graph/node";
import { patternAst } from "../patch/pattern-arg";

export function prepareSeqs(nodes: readonly GNode[], seed: number): void {
	for (const node of nodes) {
		if (node.module !== "seq") continue;
		const pattern = patternAst(node.config.pattern ?? { op: "silence" }, "seq(pattern)");
		node.config = { ...node.config, ...seqConfig(pattern, seed) };
	}
}
