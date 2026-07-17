/**
 * Bridge to expose phase-based seq functions to worklet via globalThis.
 */

import { buildEvents } from "../../devices/seq/events/build-events";
import { lookupEvent, lookupEventIndex } from "../../devices/seq/events/lookup-event";
import type { TraversalState } from "../../devices/seq/traverse/types";
import type { Expr } from "../../devices/seq/ast/types";

// Cache traversal state per expression (keyed by reference)
const stateCache = new WeakMap<Expr, TraversalState>();

function getOrCreateState(expr: Expr): TraversalState {
	let state = stateCache.get(expr);
	if (!state) {
		state = { probDecisions: {}, altPositions: {} };
		stateCache.set(expr, state);
	}
	return state;
}

function clearStateForNewCycle(state: TraversalState, cycle: number): void {
	// Clear probability decisions from old cycles
	const keysToDelete: string[] = [];
	for (const key in state.probDecisions) {
		// Keys are formatted as "path.maybe:cycle"
		if (!key.endsWith(`:${cycle}`)) {
			keysToDelete.push(key);
		}
	}
	for (const key of keysToDelete) {
		delete state.probDecisions[key];
	}
}

// biome-ignore lint/suspicious/noExplicitAny: worklet global injection
(globalThis as any).seqPhase = {
	buildEvents(expr: Expr, cycle: number) {
		const state = getOrCreateState(expr);
		clearStateForNewCycle(state, cycle);
		return buildEvents(expr, state, cycle);
	},
	lookupEvent,
	lookupEventIndex,
};
