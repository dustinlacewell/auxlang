/**
 * What each engine's monitor reads per sample, one target per watch
 * (watch-list.ts), from the built engine: the watched output's value slot
 * (lane 0), and for a seq whose tables carry sites (monitored-program.ts)
 * the node it reads ON/OFF events from, its lane count and its tables' site
 * column. A chord seq has one lane per stacked note; the event step walks
 * every lane so each note of a chord gets its own ON and OFF. Both engines
 * run the same per-sample steps over it:
 *
 *   before the walk   each reader lane's held note id and gate (seq state
 *                     fields the reader's module declares in its `monitor`
 *                     contract (ModuleSpec.monitor: `held`, `gate`))
 *   after the walk    each target's level summary from its slot (lane 0),
 *                     then each reader lane: an ON when its held note id
 *                     changed to a note (not a rest; a tie keeps its note's
 *                     id) and the row under it (the contract's `row` field) has a
 *                     site; an OFF when its gate fell from 1 to 0 (the
 *                     reader's own pre-release dip, so a real retrigger's OFF
 *                     and ON land a sample or two apart, both true)
 *
 * The reader's own state is what says a new note began or a gate fell, so a
 * note that plays on across a re-eval swap makes no event. Pure.
 */

import { hasSites, siteColumn } from "../../bridge/lane-table";
import type { NodeRun } from "../node-run";
import { type OutputLayout, slotOf } from "../output-slots";
import type { Watch } from "./live-contract";

export interface MonitorTarget {
	/** The watched output's value slot. */
	readonly slot: number;
	/** The node whose lanes report onsets for this watch; -1 for none. */
	readonly reader: number;
	/** The reader's lane count; 0 for none. */
	readonly laneCount: number;
	/** The reader's site column (bridge/lane-table.ts `siteColumn`); -1 for none. */
	readonly siteColumn: number;
	/** The reader's monitor state fields (ModuleSpec.monitor); null for none. */
	readonly fields: Readonly<{ row: string; held: string; gate: string }> | null;
}

export interface MonitorPlan {
	readonly targets: readonly MonitorTarget[];
}

export function monitorPlan(
	watches: readonly Watch[],
	runs: readonly NodeRun[],
	layout: OutputLayout,
): MonitorPlan {
	const targets = watches.map((w) => {
		const slot = slotOf(layout, w.node, w.port, 0);
		const run = runs[w.node] as NodeRun;
		if (!hasSites(run.config) || run.monitor === undefined) {
			return { slot, reader: -1, laneCount: 0, siteColumn: -1, fields: null };
		}
		return {
			slot,
			reader: w.node,
			laneCount: run.laneCount,
			siteColumn: siteColumn(run.config),
			fields: run.monitor,
		};
	});
	return { targets };
}
