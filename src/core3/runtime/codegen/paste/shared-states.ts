/**
 * Lane state objects that more than one lane holds. A pasted lane keeps its
 * state's fields in its own locals for the whole block, which is exact only
 * when no other lane writes the same object; a shared one keeps its call
 * sites. (Every engine-built lane gets its own state; this guards a module
 * whose `state()` hands out one object.)
 */

import type { NodeRun } from "../../node-run";

export function sharedStates(runs: readonly NodeRun[]): ReadonlySet<object> {
	const seen = new Set<object>();
	const shared = new Set<object>();
	for (const run of runs) {
		for (const state of run.states) {
			if (seen.has(state)) shared.add(state);
			seen.add(state);
		}
	}
	return shared;
}
