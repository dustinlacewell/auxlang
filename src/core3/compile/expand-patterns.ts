/**
 * Patterns as knobs (MANIFESTO §4.3): a pattern input becomes `seq(pattern).out`,
 * a seq node with no position, so ambient-clock resolution reads it at the
 * ambient clock. No ambient clock while a pattern is in play is a loud error
 * — a pattern with no clock can never sound.
 */

import { isPatternInput } from "../graph/input-kinds";
import type { GNode, NodeRef } from "../graph/node";

/** Replaces pattern inputs in place. Returns true if anything was expanded. */
export function expandPatterns(nodes: readonly GNode[], clockNode: GNode | null): boolean {
	let expanded = false;
	for (const node of nodes) {
		for (const [port, value] of Object.entries(node.inputs)) {
			if (!isPatternInput(value)) continue;
			node.inputs[port] = knobSeq(value.pattern, clockNode, `${node.module}.${port}`);
			expanded = true;
		}
	}
	return expanded;
}

function knobSeq(pattern: unknown, clockNode: GNode | null, where: string): NodeRef {
	if (clockNode === null) {
		throw new Error(
			`pattern input at ${where} needs an ambient clock — call clock(bpm) in the eval first`,
		);
	}
	const seq: GNode = { module: "seq", inputs: {}, config: { pattern } };
	return { node: seq, port: "out" };
}
