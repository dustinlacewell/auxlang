/**
 * Each node's identity for re-eval matching (MANIFESTO §6.2, runtime/match.ts):
 * its kind, and its place — a hash of the kind and its first path from an
 * `out` root. Wiring and constants are not identity, so adding a `.mod` or a
 * module upstream leaves a node's place alone. The pin is carried at emit.
 */

import type { GNode } from "../graph/node";
import { fnv1aHex } from "../hash/fnv1a-hex";
import type { SpecTable } from "../module/resolve";
import type { Identity } from "../types";
import { firstPaths } from "./first-paths";
import { kindOf } from "./kind";

export type Placement = Pick<Identity, "kind" | "place">;

export function identities(
	roots: readonly GNode[],
	nodes: readonly GNode[],
	specs: SpecTable,
): Map<GNode, Placement> {
	const paths = firstPaths(roots);
	const result = new Map<GNode, Placement>();
	for (const node of nodes) {
		const path = paths.get(node);
		if (path === undefined) {
			throw new Error(`'${node.module}' is not reachable from an out root (internal error)`);
		}
		const kind = kindOf(node, specs);
		result.set(node, { kind, place: `p${fnv1aHex(`${kind}@${path}`)}` });
	}
	return result;
}
