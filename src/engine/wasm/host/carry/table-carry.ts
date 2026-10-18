/**
 * What each table lane of a new engine (layout/table-lanes.ts order) takes
 * from the old engine's tables at a swap, planned on the main thread from
 * the two sides' plain data:
 *
 * - `sources`: the old lane whose cycle it is prefilled for
 *   (table-sources.ts), as (old node, old lane) pairs, -1 for none;
 * - `shared`: the paired old node whose table key (engine-facts.ts) equals
 *   its node's, else -1. That node's tables are then this lane's too,
 *   exactly (bridge/table-key.ts): the prefill copies them and continues
 *   their fill state instead of filling (seq-tables.ts `prefillLaneFrom`).
 *
 * Pure.
 */

import { tableLanes } from "../../layout/table-lanes";
import type { CarrySide } from "../carry-plan";
import { pairedNodes } from "./paired-nodes";
import { tableSources } from "./table-sources";

export interface TableCarry {
	readonly sources: Int32Array;
	readonly shared: Int32Array;
}

export function tableCarry(old: CarrySide, fresh: CarrySide): TableCarry {
	const pairs = pairedNodes(old.facts, fresh.facts);
	const shared = Int32Array.from(tableLanes(fresh.layout), ({ node }) => {
		const from = pairs.get(node);
		if (from === undefined) return -1;
		const key = fresh.facts.tables[node] ?? null;
		return key !== null && key === old.facts.tables[from] ? from : -1;
	});
	return { sources: tableSources(old, fresh), shared };
}
