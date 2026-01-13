/**
 * Output function - creates out nodes in the graph.
 *
 * Each out() call creates an out device node.
 * During expansion, voices within an out node are distributed L/R round-robin.
 */

import { createDeviceNode } from "../device/create-device-node";
import { getDeviceSpec } from "../device/registry";
import { getBuilder } from "./graph-builder";
import type { Node } from "./node";
import type { OutputRef } from "./output-ref";

// Import to register the out device
import "../devices/out";

/**
 * Creates an out node for each input signal.
 * For poly signals (arrays), creates one out node that will be expanded.
 */
export function out(signal: Node | Node[]): void {
	const builder = getBuilder();
	const spec = getDeviceSpec("out");
	if (!spec) {
		throw new Error("out device not registered");
	}

	if (Array.isArray(signal)) {
		// Poly: create one out node with array input (will be expanded)
		const refs = signal.map((n): OutputRef => ({
			ref: n.id,
			out: getDeviceSpec(n.device)?.defaultOutput ?? "signal",
		}));
		const node = createDeviceNode("out", spec, { input: refs }, {});
		const nodes = Array.isArray(node) ? node : [node];
		for (const n of nodes) builder.addNode(n);
	} else {
		// Mono: create one out node
		const ref: OutputRef = {
			ref: signal.id,
			out: getDeviceSpec(signal.device)?.defaultOutput ?? "signal",
		};
		const node = createDeviceNode("out", spec, { input: ref }, {});
		if (Array.isArray(node)) {
			for (const n of node) builder.addNode(n);
		} else {
			builder.addNode(node);
		}
	}
}
