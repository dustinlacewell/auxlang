/**
 * For each table lane of a new engine (layout/table-lanes.ts order), the
 * old engine's lane it takes over: the paired node's same lane, when that
 * lane holds tables too. The prefill reads the cycle that lane is in
 * (prefill-cycles.ts). A flat Int32Array of (old node, old lane) pairs,
 * -1 for a lane with no source. Pure.
 */

import { tableLanes } from "../../layout/table-lanes";
import type { CarrySide } from "../carry-plan";
import { pairedNodes } from "./paired-nodes";

export function tableSources(old: CarrySide, fresh: CarrySide): Int32Array {
	const pairs = pairedNodes(old.facts, fresh.facts);
	const lanes = tableLanes(fresh.layout);
	const sources = new Int32Array(2 * lanes.length).fill(-1);
	lanes.forEach(({ node, lane }, k) => {
		const from = pairs.get(node);
		if (from === undefined) return;
		if ((old.layout.nodes[from]?.lanes[lane]?.tables ?? null) === null) return;
		sources[2 * k] = from;
		sources[2 * k + 1] = lane;
	});
	return sources;
}
