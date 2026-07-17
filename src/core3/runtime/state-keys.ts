/**
 * Migration key assignment. One key per node, used both when snapshotting
 * (collectState) and when rehydrating (initialStates) — the two sides compute
 * keys identically from their own Program, so matching is:
 *   1. pin (user identity) when present,
 *   2. else structural id,
 *   3. duplicates of the same base key disambiguate positionally in topo
 *      order via a `~k` suffix (k-th duplicate matches k-th duplicate).
 */

import type { PNode } from "../types";

export function migrationKeys(nodes: readonly PNode[]): string[] {
	const seen = new Map<string, number>();
	return nodes.map((node) => {
		const base = node.pin ?? node.id;
		const k = seen.get(base) ?? 0;
		seen.set(base, k + 1);
		return k === 0 ? base : `${base}~${k}`;
	});
}
