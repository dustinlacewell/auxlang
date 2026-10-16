/**
 * The lanes that hold event tables (their module reads a pattern), in
 * layout order: node by node, lane by lane. The engine's tables
 * (host/seq-tables.ts) and the prefill's sources (host/carry/table-sources.ts)
 * both number table lanes by this order. Pure.
 */

import type { WasmLayout } from "../program/memory-layout";

export interface TableLane {
	readonly node: number;
	readonly lane: number;
	/** The lane's table slot (table-format.ts). */
	readonly slot: number;
	/** Its tables' row stride in bytes. */
	readonly rowBytes: number;
}

export function tableLanes(layout: WasmLayout): TableLane[] {
	const lanes: TableLane[] = [];
	layout.nodes.forEach((node, n) =>
		node.lanes.forEach((lane, l) => {
			if (lane.tables !== null)
				lanes.push({ node: n, lane: l, slot: lane.tables, rowBytes: lane.rowBytes });
		}),
	);
	return lanes;
}
