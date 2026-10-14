/**
 * Per-node per-lane state construction: fresh (fresh-lane-state.ts, with the
 * lane's random stream seeded from (patch seed, migration key, lane)), or
 * migrated from a previous EngineState. Migration matches by migration key
 * (pin first, then structural id, positional `~k` suffix for duplicates —
 * see state-keys.ts) and clones so the old engine's state is never shared.
 * A migrated lane keeps its `__rng`, so its random stream continues.
 */

import { streamSeed } from "../random/stream-seed";
import type { EngineState, ModuleSpec, PNode } from "../types";
import { deepClone } from "./deep-clone";
import { freshLaneState } from "./fresh-lane-state";
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
	seed: number,
	prev?: EngineState,
): LaneStateSet {
	const keys = migrationKeys(nodes);
	const states = nodes.map((node, i) => {
		const spec = specs[i] as ModuleSpec;
		const key = keys[i] as string;
		const prevLanes = prev?.nodes[key];
		return node.lanes.map((_, lane) => {
			const carried = prevLanes?.[lane];
			const state =
				carried !== undefined
					? deepClone(carried)
					: freshLaneState(spec, sampleRate, streamSeed(seed, key, lane));
			// Engine-injected lane identity (see ModuleSpec.state in types.ts).
			state.__lane = lane;
			return state;
		});
	});
	return { keys, states };
}
