/**
 * The host side of the seq tables: pattern queries stay in JS for the spike.
 * When a seq lane's position enters a new cycle, the module calls `fill`;
 * the host builds the lane's event table exactly as `laneTable` does
 * (bridge/lane-table.ts) and copies it into the lane's table in memory.
 */

import type { Pat } from "../../pattern/ast";
import { type EventTable, createTable } from "../../pattern/table/event-table";
import { fillTable } from "../../pattern/table/fill-table";
import type { NodeRun } from "../../runtime/node-run";
import { TABLE_CAPACITY, TABLE_FIELDS, type WasmLayout, tableRow } from "../program/memory-layout";

export class SeqTables {
	private readonly tables = new Map<string, EventTable>();

	constructor(
		private readonly runs: readonly NodeRun[],
		private readonly layout: WasmLayout,
		private readonly memory: () => Float64Array,
	) {}

	fill(node: number, lane: number, cycle: number): void {
		const run = this.runs[node] as NodeRun;
		const cfg = run.config;
		const state = run.states[lane] as Record<string, unknown>;
		const t = this.table(node, lane);
		const patternLane = ((state.__lane as number) | 0) % ((cfg.lanes as number) | 0 || 1);
		fillTable(cfg.pattern as Pat, (cfg.seed as number) | 0, patternLane, cycle, t);
		if (t.count > TABLE_CAPACITY)
			throw new Error(`wasm: seq node ${node} has ${t.count} rows in one cycle`);
		this.write(this.layout.nodes[node]?.lanes[lane]?.table as number, t);
	}

	private table(node: number, lane: number): EventTable {
		const key = `${node}/${lane}`;
		let t = this.tables.get(key);
		if (t === undefined) {
			t = createTable();
			this.tables.set(key, t);
		}
		return t;
	}

	private write(table: number, t: EventTable): void {
		const f64 = this.memory();
		f64[table / 8] = t.cycle;
		f64[table / 8 + 1] = t.count;
		const fields = [t.begin, t.end, t.value, t.kind, t.noteId, t.slideFrom, t.dipBefore];
		TABLE_FIELDS.forEach((_, f) => {
			const rows = fields[f] as ArrayLike<number>;
			for (let r = 0; r < t.count; r++) f64[tableRow(table, f, r) / 8] = rows[r] as number;
		});
	}
}
