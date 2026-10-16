/**
 * The runs that carry one lane's given fields (carry-fields.ts picked them,
 * against module/front/state/shape-fits.ts), as runtime/hand-over/carry-states.ts
 * copies a JS lane: `__rng` (the random stream) only when the seed is
 * unchanged; the engine-injected fields stay the new engine's.
 */

import type { Field } from "../../layout/state-shape";
import type { LaneMemory } from "../../program/memory-layout";
import { CARRY_F64 } from "./carry-run";
import type { RunList } from "./run-list";
import { fieldRuns } from "./shape-runs";

export function laneRuns(
	runs: RunList,
	old: LaneMemory,
	fresh: LaneMemory,
	fields: readonly string[],
	keepStream: boolean,
): void {
	for (const name of fields) {
		if (!keepStream && name === "__rng") continue;
		const scalar = fresh.state[name];
		if (scalar !== undefined) {
			runs.add(old.state[name] as number, scalar, 8, CARRY_F64);
			continue;
		}
		const from = old.aggregates[name] as Field;
		const to = fresh.aggregates[name] as Field;
		fieldRuns(runs, from, 0, to, 0, false);
	}
}
