/**
 * Each node's identity for re-eval matching (MANIFESTO §6.2, runtime/match.ts):
 * its kind; its place — a hash of the kind and its first path from an `out`
 * root; its upstream signature, which breaks ties among nodes sharing a
 * place; and its constant evidence, which breaks the ties left after that.
 * Wiring and constants are not identity, so adding a `.mod` or a
 * module upstream leaves a node's place alone. The pin is carried at emit.
 */

import type { GNode } from "../graph/node";
import { fnv1aHex } from "../hash/fnv1a-hex";
import type { SpecTable } from "../dsp/resolve";
import type { Identity } from "../types";
import { constantEvidence } from "./constant-evidence";
import { firstPaths } from "./first-paths";
import { kindOf } from "./kind";
import { portHops } from "./port-hop";
import { upstreamSignatures } from "./upstream-signatures";

export type Placement = Omit<Identity, "pin">;

/** `order` must be topologically sorted (z-edges cut). */
export function identities(
	roots: readonly GNode[],
	order: readonly GNode[],
	specs: SpecTable,
): Map<GNode, Placement> {
	const hopOf = portHops(specs);
	const paths = firstPaths(roots, hopOf);
	const kinds = new Map(order.map((node) => [node, kindOf(node)]));
	const upstream = upstreamSignatures(order, kinds, hopOf);
	const constants = constantEvidence(order);
	const result = new Map<GNode, Placement>();
	for (const node of order) {
		const path = paths.get(node);
		if (path === undefined) {
			throw new Error(`'${node.module}' is not reachable from an out root (internal error)`);
		}
		const kind = kinds.get(node) as string;
		result.set(node, {
			kind,
			place: `p${fnv1aHex(`${kind}@${path}`)}`,
			upstream: upstream.get(node) as string,
			constants: constants.get(node) as number[],
		});
	}
	return result;
}
