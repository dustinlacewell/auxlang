/**
 * Per-node per-lane state construction: fresh (fresh-lane-state.ts, with the
 * lane's random stream seeded from (patch seed, migration key, lane)), or
 * migrated from a previous EngineState. The matcher (match.ts) pairs each new
 * node with the old node whose state it takes over — by pin, then place, then
 * kind — so rewiring resets nothing (MANIFESTO §6.2). Keys follow the pairing
 * (state-keys.ts). Migration clones, so the old engine's state is never
 * shared. Nothing migrates across a sample-rate change (state buffers are
 * sized from it). A paired node still starts fresh, alone, when its carried
 * state does not fit the fresh state's shape (state-fits.ts) — config is not
 * consulted. A migrated lane keeps its `__rng`, so its random stream
 * continues.
 *
 * The engine injects three per-lane fields after construction, none part of
 * the state's shape: `__lane` (the lane index), `__scratch` (an empty record
 * a module may fill with data derived from config, such as event tables) and
 * `__seed` (the patch seed, which `hashRandom(key)` in a tick reads). Scratch
 * is never carried: every engine starts it empty.
 */

import { streamSeed } from "../random/stream-seed";
import type { EngineState, KeyedIdentity, ModuleSpec, PNode } from "../types";
import { deepClone } from "./deep-clone";
import { freshLaneState } from "./fresh-lane-state";
import { match } from "./match";
import { stateFits } from "./state-fits";
import { migrationKeys } from "./state-keys";

export interface LaneStateSet {
	/** identities[i] is node i's identity and migration key (also used by collectState). */
	readonly identities: readonly KeyedIdentity[];
	/** states[i][lane] is node i's lane state. */
	readonly states: readonly Record<string, unknown>[][];
	/** New node index → the old key it matched (empty without a previous engine). */
	readonly paired: ReadonlyMap<number, string>;
}

export function buildLaneStates(
	nodes: readonly PNode[],
	specs: readonly ModuleSpec[],
	sampleRate: number,
	seed: number,
	prev?: EngineState,
): LaneStateSet {
	const paired = prev === undefined ? new Map<number, string>() : match(prev.identities, nodes);
	const keys = migrationKeys(nodes, paired);
	const states = nodes.map((node, i) => {
		const spec = specs[i] as ModuleSpec;
		const key = keys[i] as string;
		const prevLanes = carriedLanes(prev, sampleRate, paired.get(i));
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
	return { identities: nodes.map((node, i) => keyed(node, keys[i] as string)), states, paired };
}

/** The previous engine's lanes under the paired old key, unless the sample rate changed (state buffers are sized from it). */
function carriedLanes(
	prev: EngineState | undefined,
	sampleRate: number,
	oldKey: string | undefined,
): Record<string, unknown>[] | undefined {
	if (prev === undefined || oldKey === undefined || prev.sampleRate !== sampleRate)
		return undefined;
	return prev.nodes[oldKey];
}

function keyed(node: PNode, key: string): KeyedIdentity {
	const { kind, place, upstream, constants } = node;
	const identity = { key, kind, place, upstream, constants };
	return node.pin === undefined ? identity : { ...identity, pin: node.pin };
}
