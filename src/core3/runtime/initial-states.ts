/**
 * Per-node per-lane state construction: fresh (fresh-lane-state.ts, with the
 * lane's random stream seeded from (patch seed, migration key, lane)), or
 * migrated from a previous EngineState. Migration matches by migration key
 * (pin first, then structural id, positional `~k` suffix for duplicates —
 * see state-keys.ts) and clones so the old engine's state is never shared.
 * Nothing migrates across a sample-rate change (state buffers are sized from
 * it). A matched node still starts fresh, alone, when its carried state does
 * not fit the fresh state's shape (state-fits.ts) — config is not consulted
 * (MANIFESTO §6.2). A migrated lane keeps its `__rng`, so its random stream
 * continues.
 *
 * The engine injects three per-lane fields after construction, none part of
 * the state's shape: `__lane` (the lane index), `__scratch` (an empty record
 * a module may fill with data derived from config, such as event tables) and
 * `__seed` (the patch seed, which `hashRandom(key)` in a tick reads). Scratch
 * is never carried: every engine starts it empty.
 */

import { streamSeed } from "../random/stream-seed";
import type { EngineState, ModuleSpec, PNode } from "../types";
import { deepClone } from "./deep-clone";
import { freshLaneState } from "./fresh-lane-state";
import { stateFits } from "./state-fits";
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
		const prevLanes = carriedLanes(prev, sampleRate, key);
		return node.lanes.map((_, lane) => {
			const carried = prevLanes?.[lane];
			const fresh = freshLaneState(spec, sampleRate, streamSeed(seed, key, lane));
			const state = carried !== undefined && stateFits(carried, fresh) ? deepClone(carried) : fresh;
			state.__lane = lane;
			state.__scratch = {};
			state.__seed = seed;
			return state;
		});
	});
	return { keys, states };
}

/** The previous engine's lanes for `key`, unless the sample rate changed (state buffers are sized from it). */
function carriedLanes(
	prev: EngineState | undefined,
	sampleRate: number,
	key: string,
): Record<string, unknown>[] | undefined {
	if (prev === undefined || prev.sampleRate !== sampleRate) return undefined;
	return prev.nodes[key];
}
