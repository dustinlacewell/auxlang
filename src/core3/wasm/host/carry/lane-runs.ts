/**
 * The runs that carry one fitting lane (module/front/state/shape-fits.ts), as
 * runtime/hand-over/carry-states.ts copies a JS lane: every field of the
 * shape, `__rng` (the random stream) only when the seed is unchanged; the
 * engine-injected fields stay the new engine's.
 */

import { shapeKeys } from "../../../module/front/state/engine-fields";
import type { Field } from "../../layout/state-shape";
import type { LaneMemory } from "../../program/memory-layout";
import { CARRY_F64 } from "./carry-run";
import type { RunList } from "./run-list";
import { fieldRuns } from "./shape-runs";

const STREAM = "__rng";

export function laneRuns(
	runs: RunList,
	old: LaneMemory,
	fresh: LaneMemory,
	keepStream: boolean,
): void {
	for (const name of shapeKeys(fresh.state)) {
		if (name === STREAM && !keepStream) continue;
		runs.add(old.state[name] as number, fresh.state[name] as number, 8, CARRY_F64);
	}
	for (const name of shapeKeys(fresh.aggregates)) {
		const from = old.aggregates[name] as Field;
		const to = fresh.aggregates[name] as Field;
		fieldRuns(runs, from, 0, to, 0, false);
	}
}
