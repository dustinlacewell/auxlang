/**
 * State migration (MANIFESTO §6.2) as a hand-over into a built engine: each
 * new node paired with an old key (reeval-identities.ts) takes the old
 * node's lane values into its fresh lane states. A lane whose carried state
 * does not fit the fresh shape (state-fits.ts) stays fresh, alone; config is
 * not consulted. A carried lane keeps its `__rng`, so its random stream
 * continues — unless its seed changed (a reroll, an edited `.seed(n)`): then
 * it keeps the fresh stream. The engine-injected fields stay the new
 * engine's own.
 *
 * State is fixed-shape (§5), so which lanes fit is known before the swap:
 * `planCarry` pairs each fitting fresh lane with the old engine's live lane
 * during the build, and `applyCarry` only copies values at the swap. Values
 * are copied, never shared.
 */

import { copyInto } from "./copy-into";
import { stateFits } from "../state-fits";

type LaneState = Record<string, unknown>;

/** A fresh lane, the old lane it takes values from, and the fields it keeps. */
export interface CarryPair {
	readonly to: LaneState;
	readonly from: LaneState;
	readonly skip: ReadonlySet<string>;
}

const ENGINE_FIELDS: ReadonlySet<string> = new Set(["__lane", "__scratch", "__seed"]);
const ENGINE_FIELDS_AND_STREAM: ReadonlySet<string> = new Set([...ENGINE_FIELDS, "__rng"]);

/** The fitting lanes of one node: its fresh states against the old node's lanes. */
export function planCarry(
	fresh: readonly LaneState[],
	old: readonly LaneState[] | undefined,
): CarryPair[] {
	if (old === undefined) return [];
	return fresh.flatMap((to, lane) => {
		const from = old[lane];
		if (from === undefined || !stateFits(from, to)) return [];
		return [
			{ to, from, skip: from.__seed === to.__seed ? ENGINE_FIELDS : ENGINE_FIELDS_AND_STREAM },
		];
	});
}

export function applyCarry(pairs: readonly CarryPair[]): void {
	for (const { to, from, skip } of pairs) copyInto(to, from, skip);
}
