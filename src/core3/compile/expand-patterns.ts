/**
 * Pattern inputs become patsig nodes: `{ module: "patsig", config: { pattern } }`
 * clocked by the eval's ambient clock (phase input). No ambient clock while a
 * pattern is in play is a loud error — a pattern with no clock can never sound.
 */

import { getModule } from "../module/define";
import { isPatternInput } from "../graph/input-kinds";
import type { GNode } from "../graph/node";

/** Replaces pattern inputs in place. Returns true if anything was expanded. */
export function expandPatterns(nodes: readonly GNode[], clockNode: GNode | null): boolean {
	let expanded = false;
	for (const node of nodes) {
		for (const [port, value] of Object.entries(node.inputs)) {
			if (!isPatternInput(value)) continue;
			node.inputs[port] = patsigRef(value.pattern, clockNode, `${node.module}.${port}`);
			expanded = true;
		}
	}
	return expanded;
}

function patsigRef(pattern: unknown, clockNode: GNode | null, where: string) {
	if (clockNode === null) {
		throw new Error(`pattern input at ${where} needs an ambient clock — call clock(bpm) in the eval first`);
	}
	const spec = getModule("patsig");
	if (!("phase" in spec.ins)) {
		throw new Error(`module 'patsig' must declare a 'phase' input to host pattern signals`);
	}
	if (!("phase" in getModule(clockNode.module).outs)) {
		throw new Error(`ambient clock module '${clockNode.module}' has no 'phase' output`);
	}
	const patsig: GNode = {
		module: "patsig",
		inputs: { phase: { node: clockNode, port: "phase" } },
		config: { pattern },
	};
	return { node: patsig, port: spec.defaultOut };
}
