/**
 * Each node's upstream signature: a hash of its kind and, per input port in
 * name order, the port name, the source's output port and the source's
 * signature — recursively, so it names everything that feeds the node.
 * Constants, config and lambda source are not part of it. The matcher uses it
 * only to break ties among nodes that share a place (runtime/match.ts), so
 * swapped parallel chains keep their own state. Computed in topo order so
 * every plain source is signed first; a z-edge source is described shallowly
 * (module:port) to keep the recursion well-founded across cycles.
 */

import { isLambdaInput, isNodeRef, isZRef } from "../graph/input-kinds";
import type { GNode, InputValue } from "../graph/node";
import { fnv1aHex } from "../hash/fnv1a-hex";

/** `order` must be topologically sorted (z-edges cut); `kinds` covers every node in it. */
export function upstreamSignatures(
	order: readonly GNode[],
	kinds: ReadonlyMap<GNode, string>,
): Map<GNode, string> {
	const signatures = new Map<GNode, string>();
	for (const node of order) {
		const ports = Object.keys(node.inputs)
			.sort()
			.map((port) => `${port}=${sourceOf(node.inputs[port], signatures)}`);
		signatures.set(node, `u${fnv1aHex(`${kinds.get(node)}|${ports.join(",")}`)}`);
	}
	return signatures;
}

function sourceOf(value: InputValue | undefined, signatures: ReadonlyMap<GNode, string>): string {
	if (value === undefined || typeof value === "number") return "c";
	if (isLambdaInput(value)) return "l";
	if (isNodeRef(value)) return `${signatures.get(value.node)}:${value.port}`;
	if (isZRef(value)) return `z:${value.z.node.module}:${value.z.port}`;
	return "p"; // patterns are expanded before identities are computed
}
