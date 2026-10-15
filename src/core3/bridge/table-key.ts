/**
 * A pattern-reading node's table key: what its lanes' event tables are a
 * function of besides lane and cycle. `fillLaneTable` (lane-table.ts) reads
 * the config's pattern, its seed (the patch seed, or the node's own
 * `.seed(n)`: seq-config.ts) and its pattern lanes, and nothing else. Two
 * nodes with equal keys fill equal tables for each (lane, cycle), so a
 * re-eval's lane can take the tables of its paired old lane
 * (wasm/host/carry/table-carry.ts). Pure.
 */

import type { Pat } from "../pattern/ast";
import { patternKey } from "../pattern/pattern-key";
import { patternLanes } from "./lane-table";

export function tableKey(cfg: Record<string, unknown>): string {
	return `${(cfg.seed as number) | 0}/${patternLanes(cfg)}/${patternKey(cfg.pattern as Pat)}`;
}
