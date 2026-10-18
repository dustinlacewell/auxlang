/**
 * Seq preparation: every seq node's `pattern` config (a mini-notation string,
 * `p` pattern, or Pat data, as the user passed it) becomes voiced Pat data
 * with its lane count, width hint, and the program seed, or the node's own
 * `.seed(n)` (bridge/seq-config). The node's record outputs must still be
 * the pattern's record fields (patch/record-members).
 * Runs before width resolution, for seqs built by the user and by pattern
 * lifting alike. A bad pattern is a loud error naming seq, pointing at the
 * bad token when the string was written in the call, else at the call.
 */

import { seqConfig } from "../bridge/seq-config";
import type { GNode } from "../graph/node";
import { getModule } from "../dsp/define";
import { patternAst } from "../patch/pattern-arg";
import { assertRecordMembers } from "../patch/record-members";
import { activeNotationSource } from "../source/active-source";
import { atNode } from "./at-node";

export function prepareSeqs(nodes: readonly GNode[], seed: number): void {
	for (const node of nodes) {
		if (node.module !== "seq") continue;
		const written = activeNotationSource(node.bindingSites?.pattern);
		const pattern = atNode(node, () => {
			const ast = patternAst(node.config.pattern ?? { op: "silence" }, "seq(pattern)", written);
			assertRecordMembers(getModule("seq"), node.groups, ast);
			return ast;
		});
		node.config = { ...node.config, ...seqConfig(pattern, node.seed ?? seed) };
	}
}
