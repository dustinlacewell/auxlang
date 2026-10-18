/**
 * State migration (MANIFESTO §6.2) as a hand-over into a built engine: each
 * new node paired with an old key (reeval-identities.ts) takes the old
 * node's lane values into its fresh lane states. A lane carries the fields
 * `carryFields` (module/front/state/carry-fields.ts) picks, by the module's
 * `writes`. A carried lane keeps its `__rng`, so its random stream
 * continues — unless its seed changed (a reroll, an edited `.seed(n)`): then
 * it keeps the fresh stream. The engine-injected fields stay the new
 * engine's own.
 *
 * State is fixed-shape (§5), so which lanes carry what is known before the
 * swap: `planCarry` pairs each lane with its fields and the old engine's
 * live lane during the build, and `applyCarry` only copies values at the
 * swap. Values are copied, never shared.
 */

import { carryFields } from "../../module/front/state/carry-fields";
import { laneShapeOf } from "../../module/front/state/state-shape-of";
import { copyFields } from "./copy-into";

type LaneState = Record<string, unknown>;

/** A fresh lane, the old lane it takes values from, and the fields it carries. */
export interface CarryPair {
	readonly to: LaneState;
	readonly from: LaneState;
	readonly fields: readonly string[];
}

const STREAM = "__rng";

/** The fitting lanes of one node: its fresh states against the old node's lanes. */
export function planCarry(
	fresh: readonly LaneState[],
	old: readonly LaneState[] | undefined,
	writes: readonly string[],
): CarryPair[] {
	if (old === undefined) return [];
	return fresh.flatMap((to, lane) => {
		const from = old[lane];
		if (from === undefined) return [];
		const fields = carryFields(laneShapeOf(from), laneShapeOf(to), writes);
		if (fields === null) return [];
		const keepStream = from.__seed === to.__seed;
		return [{ to, from, fields: keepStream ? fields : fields.filter((f) => f !== STREAM) }];
	});
}

export function applyCarry(pairs: readonly CarryPair[]): void {
	for (const { to, from, fields } of pairs) copyFields(to, from, fields);
}
