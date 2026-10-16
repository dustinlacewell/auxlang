/**
 * What each engine's monitor reads per sample, one target per watch
 * (watch-list.ts), from the built engine: the watched output's value slot
 * (lane 0), and for a seq whose tables carry sites (monitored-program.ts)
 * the node it reads onsets from and its tables' site column. Both engines
 * run the same per-sample steps over it:
 *
 *   before the walk   each reader's held note id (seq state `heldId`)
 *   after the walk    each target's level summary from its slot, then each
 *                     reader's onset: its held note id changed to a note
 *                     (not a rest; a tie keeps its note's id), and the row
 *                     under it (state `lastRow`) has a site
 *
 * The seq's own state is what says a new note began, so a note that plays
 * on across a re-eval swap makes no onset. Pure.
 */

import { hasSites, siteColumn } from "../../bridge/lane-table";
import type { NodeRun } from "../node-run";
import { type OutputLayout, slotOf } from "../output-slots";
import type { Watch } from "./live-contract";

export interface MonitorTarget {
	/** The watched output's value slot. */
	readonly slot: number;
	/** The node whose lane 0 reports onsets for this watch; -1 for none. */
	readonly reader: number;
	/** The reader's site column (bridge/lane-table.ts `siteColumn`); -1 for none. */
	readonly siteColumn: number;
}

export interface MonitorPlan {
	readonly targets: readonly MonitorTarget[];
}

/** The seq state fields the onset step reads. */
export const READER_ROW = "lastRow";
export const READER_NOTE = "heldId";

export function monitorPlan(
	watches: readonly Watch[],
	runs: readonly NodeRun[],
	layout: OutputLayout,
): MonitorPlan {
	const targets = watches.map((w) => {
		const slot = slotOf(layout, w.node, w.port, 0);
		const config = (runs[w.node] as NodeRun).config;
		if (!hasSites(config)) return { slot, reader: -1, siteColumn: -1 };
		return { slot, reader: w.node, siteColumn: siteColumn(config) };
	});
	return { targets };
}
