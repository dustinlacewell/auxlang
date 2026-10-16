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
import type { PortHop } from "./port-hop";

/** `order` must be topologically sorted (z-edges cut); `kinds` covers every node in it. */
export function upstreamSignatures(
	order: readonly GNode[],
	kinds: ReadonlyMap<GNode, string>,
	hopOf: PortHop,
): Map<GNode, string> {
	const signatures = new Map<GNode, string>();
	for (const node of order) {
		const ports = hopEntries(node, hopOf, signatures);
		signatures.set(node, `u${fnv1aHex(`${kinds.get(node)}|${ports.join(",")}`)}`);
	}
	return signatures;
}

/**
 * `port=source` per port in name order; a port group is one entry,
 * `group=[sources sorted]`, at its name's place, so its members' names and
 * order are not part of the signature.
 */
function hopEntries(node: GNode, hopOf: PortHop, signatures: ReadonlyMap<GNode, string>): string[] {
	const entries = new Map<string, string>();
	const groups = new Map<string, string[]>();
	for (const port of Object.keys(node.inputs)) {
		const hop = hopOf(node, port);
		const source = sourceOf(node.inputs[port], signatures);
		if (hop === port) entries.set(port, source);
		else groups.set(hop, [...(groups.get(hop) ?? []), source]);
	}
	for (const [group, sources] of groups) entries.set(group, `[${sources.sort().join(",")}]`);
	return [...entries.keys()].sort().map((hop) => `${hop}=${entries.get(hop)}`);
}

function sourceOf(value: InputValue | undefined, signatures: ReadonlyMap<GNode, string>): string {
	if (value === undefined || typeof value === "number") return "c";
	if (isLambdaInput(value)) return "l";
	if (isNodeRef(value)) return `${signatures.get(value.node)}:${value.port}`;
	if (isZRef(value)) return `z:${value.z.node.module}:${value.z.port}`;
	return "p"; // patterns are expanded before identities are computed
}
