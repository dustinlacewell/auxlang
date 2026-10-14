/**
 * Per-node per-lane state construction: fresh (fresh-lane-state.ts, with the
 * lane's random stream seeded from (patch seed, migration key, lane)), or
 * migrated from a previous EngineState. Migration matches by migration key
 * (pin first, then structural id, positional `~k` suffix for duplicates —
 * see state-keys.ts) and clones so the old engine's state is never shared.
 * A matched node still starts fresh, alone, when its own config changed
 * (config-fingerprint.ts) or its carried state does not fit the fresh state's
 * shape (state-fits.ts). A migrated lane keeps its `__rng`, so its random
 * stream continues.
 */

import { streamSeed } from "../random/stream-seed";
import type { EngineState, ModuleSpec, PNode } from "../types";
import { configFingerprint } from "./config-fingerprint";
import { deepClone } from "./deep-clone";
import { freshLaneState } from "./fresh-lane-state";
import { stateFits } from "./state-fits";
import { migrationKeys } from "./state-keys";

export interface LaneStateSet {
	/** keys[i] is node i's migration key (also used by collectState). */
	readonly keys: readonly string[];
	/** configs[i] is node i's config fingerprint (also used by collectState). */
	readonly configs: readonly string[];
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
	const configs = nodes.map((node, i) => configFingerprint(specs[i] as ModuleSpec, node));
	const states = nodes.map((node, i) => {
		const spec = specs[i] as ModuleSpec;
		const key = keys[i] as string;
		const prevLanes = carriedLanes(prev, key, configs[i] as string);
		return node.lanes.map((_, lane) => {
			const carried = prevLanes?.[lane];
			const fresh = freshLaneState(spec, sampleRate, streamSeed(seed, key, lane));
			const state =
				carried !== undefined && stateFits(carried, fresh) ? deepClone(carried) : fresh;
			// Engine-injected lane identity (see ModuleSpec.state in types.ts).
			state.__lane = lane;
			return state;
		});
	});
	return { keys, configs, states };
}

/** The previous engine's lanes for `key`, unless that node's config changed. */
function carriedLanes(
	prev: EngineState | undefined,
	key: string,
	config: string,
): Record<string, unknown>[] | undefined {
	if (prev === undefined || prev.configs[key] !== config) return undefined;
	return prev.nodes[key];
}
