/**
 * The swap's hand-over as a plan of memory copies (MANIFESTO §6.2), made
 * ahead on the main thread from two engines' plain data: the old and the new
 * layout and facts (engine-facts.ts). It carries what the JS hand-over
 * carries (runtime/live-engine.ts `handOver`):
 *
 * - the sample count, always;
 * - each live slot whose site the old program has, always
 *   (runtime/live/slot-carry.ts);
 * - at an unchanged sample rate, each paired node's lanes whose state fits
 *   (by state shape, as the JS carry fits: module/front/state/shape-fits.ts),
 *   `__rng` unless the seed changed;
 * - at an unchanged sample rate, the feedback slots of paired sources.
 *
 * The result is a flat Int32Array of runs (carry/carry-run.ts) that the
 * worklet runs in the swap block (carry/run-carry.ts). Pure.
 */

import { shapeFits } from "../../module/front/state/shape-fits";
import { slotPairs } from "../../runtime/live/slot-carry";
import type { WasmLayout } from "../program/memory-layout";
import { CARRY_F64 } from "./carry/carry-run";
import { feedbackRuns } from "./carry/feedback-runs";
import { laneRuns } from "./carry/lane-runs";
import { pairedNodes } from "./carry/paired-nodes";
import { RunList } from "./carry/run-list";
import type { EngineFacts } from "./engine-facts";

/** One engine as a hand-over sees it. */
export interface CarrySide {
	readonly layout: WasmLayout;
	readonly facts: EngineFacts;
}

export function planCarry(old: CarrySide, fresh: CarrySide): Int32Array {
	const runs = new RunList();
	runs.add(old.layout.count, fresh.layout.count, 8, CARRY_F64);
	for (const [to, from] of slotPairs(fresh.facts.slotSites, old.facts.slotSites))
		runs.add(old.layout.slots + 8 * from, fresh.layout.slots + 8 * to, 8, CARRY_F64);
	if (old.facts.sampleRate !== fresh.facts.sampleRate) return runs.toArray();
	const oldIndex = pairedNodes(old.facts, fresh.facts);
	for (const [node, from] of oldIndex) nodeRuns(runs, old, fresh, from, node);
	feedbackRuns(runs, old, fresh, oldIndex);
	return runs.toArray();
}

/** Each fresh lane that the old node also has and whose state fits. */
function nodeRuns(runs: RunList, old: CarrySide, fresh: CarrySide, from: number, to: number): void {
	const oldLanes = old.layout.nodes[from]?.lanes ?? [];
	const keepStream = old.facts.seeds[from] === fresh.facts.seeds[to];
	fresh.layout.nodes[to]?.lanes.forEach((lane, l) => {
		const source = oldLanes[l];
		if (source !== undefined && shapeFits(source.shape, lane.shape))
			laneRuns(runs, source, lane, keepStream);
	});
}
