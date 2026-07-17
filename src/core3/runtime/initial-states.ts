/**
 * Per-node per-lane state construction: fresh from `spec.state(sampleRate)`,
 * or migrated from a previous EngineState. Migration matches by migration key
 * (pin first, then structural id, positional `~k` suffix for duplicates —
 * see state-keys.ts) and clones so the old engine's state is never shared.
 */

import type { EngineState, PNode, ModuleSpec } from "../types";
import { deepClone } from "./deep-clone";
import { migrationKeys } from "./state-keys";

export interface LaneStateSet {
	/** keys[i] is node i's migration key (also used by collectState). */
	readonly keys: readonly string[];
	/** states[i][lane] is node i's lane state. */
	readonly states: readonly Record<string, unknown>[][];
}

export function buildLaneStates(
	nodes: readonly PNode[],
	specs: readonly ModuleSpec[],
	sampleRate: number,
	prev?: EngineState,
): LaneStateSet {
	const keys = migrationKeys(nodes);
	const states = nodes.map((node, i) => {
		const spec = specs[i] as ModuleSpec;
		const prevLanes = prev?.nodes[keys[i] as string];
		return node.lanes.map((_, lane) => {
			const carried = prevLanes?.[lane];
			const state = carried !== undefined ? deepClone(carried) : spec.state ? spec.state(sampleRate) : {};
			// Engine-injected lane identity (see ModuleSpec.state in types.ts).
			state.__lane = lane;
			return state;
		});
	});
	return { keys, states };
}
