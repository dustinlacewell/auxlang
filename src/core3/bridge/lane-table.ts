/**
 * The event table a seq lane reads at position `pos`: kept in the lane's
 * engine scratch (derived data, never carried across a re-eval) and refilled
 * whenever the position leaves the cycle it holds. Lane `l` reads pattern
 * lane `l % lanes`.
 */

import type { Pat } from "../pattern/ast";
import { type EventTable, createTable } from "../pattern/table/event-table";
import { fillTable } from "../pattern/table/fill-table";

export function laneTable(
	s: Record<string, unknown>,
	cfg: Record<string, unknown>,
	pos: number,
): EventTable {
	const scratch = s.__scratch as { table?: EventTable };
	const t = scratch.table ?? createTable();
	scratch.table = t;
	const cycle = Math.floor(pos);
	if (cycle !== t.cycle) {
		const lane = ((s.__lane as number) | 0) % ((cfg.lanes as number) | 0 || 1);
		fillTable(cfg.pattern as Pat, (cfg.seed as number) | 0, lane, cycle, t);
	}
	return t;
}
