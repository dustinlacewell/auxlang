/**
 * A pattern-reading lane's event table (module/front/intrinsics/table-intrinsics.ts),
 * kept in the lane's engine scratch: derived data, never carried across a
 * re-eval as state (the WASM prefill continues a lane's fill when its table
 * key is unchanged: table-key.ts). The lane is born with an empty table
 * (cycle NaN), so a tick reads
 * `state.__scratch.table` directly; the tick refills it when the position
 * leaves the cycle it holds. Lane `l` reads pattern lane `l % config.lanes`.
 * Beside the table, the scratch holds the lane's LaneFill (what the next
 * fill can reuse), whose queries the node's lanes share.
 */

import type { Pat } from "../pattern/ast";
import { CycleQueries } from "../pattern/table/cycle-queries";
import { type EventTable, createTable } from "../pattern/table/event-table";
import { fillTable } from "../pattern/table/fill-table";
import { LaneFill } from "../pattern/table/lane-fill";
import type { ModuleSpec } from "../types";

type TableScratch = {
	readonly table: EventTable;
	readonly fill: LaneFill;
};

/** The queries a node's lanes share; undefined when the module reads no pattern. */
export function nodeQueries(spec: ModuleSpec): CycleQueries | undefined {
	return spec.reads === "pattern" ? new CycleQueries() : undefined;
}

/**
 * A fresh lane's scratch record: an empty table and its fill when the module
 * reads a pattern, querying through `queries` (its own when none is given).
 */
export function freshScratch(spec: ModuleSpec, queries?: CycleQueries): Record<string, unknown> {
	if (spec.reads !== "pattern") return {};
	const scratch: TableScratch = {
		table: createTable(),
		fill: new LaneFill(queries ?? new CycleQueries()),
	};
	return scratch;
}

/** The lane's table. */
export function laneTable(s: Record<string, unknown>): EventTable {
	return (s.__scratch as TableScratch).table;
}

/**
 * Refill the lane's table with the rows of `cycle`. It reads the config's
 * pattern, seed and pattern lanes, and nothing else (table-key.ts).
 */
export function fillLaneTable(
	s: Record<string, unknown>,
	cfg: Record<string, unknown>,
	cycle: number,
): void {
	const lane = ((s.__lane as number) | 0) % patternLanes(cfg);
	const { table, fill } = s.__scratch as TableScratch;
	fillTable(cfg.pattern as Pat, (cfg.seed as number) | 0, lane, cycle, table, fill);
}

/** The pattern lanes a node's lanes read in turn (at least 1). */
export function patternLanes(cfg: Record<string, unknown>): number {
	return (cfg.lanes as number) | 0 || 1;
}

/**
 * The lane's fill goes on from what lane `from`'s remembers: a lane of a
 * node with the same table key (table-key.ts) and the same lane index, so
 * all of it holds here.
 */
export function continueLaneFill(s: Record<string, unknown>, from: Record<string, unknown>): void {
	(s.__scratch as TableScratch).fill.continueFrom((from.__scratch as TableScratch).fill);
}
