/**
 * The host side of the event tables: pattern queries stay in JS for the
 * spike. When a lane's position enters a new cycle, the module calls `fill`;
 * the host refills the lane's scratch table as the JS binding does
 * (bridge/lane-table.ts) and copies it into the lane's table in memory.
 */

import { fillLaneTable, laneTable } from "../../bridge/lane-table";
import { TABLE_ROW_FIELDS } from "../../module/tick-subset/table-intrinsics";
import type { EventTable } from "../../pattern/table/event-table";
import type { NodeRun } from "../../runtime/node-run";
import { TABLE_CAPACITY, type WasmLayout, tableRow } from "../program/memory-layout";

export class SeqTables {
	constructor(
		private readonly runs: readonly NodeRun[],
		private readonly layout: WasmLayout,
		private readonly memory: () => Float64Array,
	) {}

	fill(node: number, lane: number, cycle: number): void {
		const run = this.runs[node] as NodeRun;
		const state = run.states[lane] as Record<string, unknown>;
		fillLaneTable(state, run.config, cycle);
		const t = laneTable(state);
		if (t.count > TABLE_CAPACITY)
			throw new Error(`wasm: node ${node} has ${t.count} rows in one cycle`);
		this.write(this.layout.nodes[node]?.lanes[lane]?.table as number, t);
	}

	private write(table: number, t: EventTable): void {
		const f64 = this.memory();
		f64[table / 8] = t.cycle;
		f64[table / 8 + 1] = t.count;
		TABLE_ROW_FIELDS.forEach((field, f) => {
			const rows = t[field];
			for (let r = 0; r < t.count; r++) f64[tableRow(table, f, r) / 8] = rows[r] as number;
		});
	}
}
