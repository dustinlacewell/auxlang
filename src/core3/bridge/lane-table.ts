/**
 * A pattern-reading lane's event table (module/tick-subset/table-intrinsics.ts),
 * kept in the lane's engine scratch: derived data, never carried across a
 * re-eval. The tick refills it when the position leaves the cycle it holds.
 * Lane `l` reads pattern lane `l % config.lanes`.
 */

import type { Pat } from "../pattern/ast";
import { type EventTable, createTable } from "../pattern/table/event-table";
import { fillTable } from "../pattern/table/fill-table";

/** The lane's table, made empty (cycle NaN) on first use. */
export function laneTable(s: Record<string, unknown>): EventTable {
	const scratch = s.__scratch as { table?: EventTable };
	const t = scratch.table;
	if (t !== undefined) return t;
	const made = createTable();
	scratch.table = made;
	return made;
}

/** Refill the lane's table with the rows of `cycle`. */
export function fillLaneTable(
	s: Record<string, unknown>,
	cfg: Record<string, unknown>,
	cycle: number,
): void {
	const lane = ((s.__lane as number) | 0) % ((cfg.lanes as number) | 0 || 1);
	fillTable(cfg.pattern as Pat, (cfg.seed as number) | 0, lane, cycle, laneTable(s));
}
