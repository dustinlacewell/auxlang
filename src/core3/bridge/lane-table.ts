/**
 * A pattern-reading lane's event table (module/tick-subset/table-intrinsics.ts),
 * kept in the lane's engine scratch: derived data, never carried across a
 * re-eval. The lane is born with an empty table (cycle NaN), so a tick reads
 * `state.__scratch.table` directly; the tick refills it when the position
 * leaves the cycle it holds. Lane `l` reads pattern lane `l % config.lanes`.
 */

import type { Pat } from "../pattern/ast";
import { type EventTable, createTable } from "../pattern/table/event-table";
import { fillTable } from "../pattern/table/fill-table";
import type { ModuleSpec } from "../types";

/** A fresh lane's scratch record: it holds an empty table when the module reads a pattern. */
export function freshScratch(spec: ModuleSpec): Record<string, unknown> {
	return spec.reads === "pattern" ? { table: createTable() } : {};
}

/** The lane's table. */
export function laneTable(s: Record<string, unknown>): EventTable {
	return (s.__scratch as { table: EventTable }).table;
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
