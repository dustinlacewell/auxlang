/**
 * A node's fresh lane states (fresh-lane-state.ts), each lane's random
 * stream seeded from (patch seed, migration key, lane), or from (local seed,
 * lane) for a node with its own `.seed(n)`. The engine injects three
 * per-lane fields, none part of the state's shape: `__lane` (the lane
 * index), `__scratch` (a record for data derived from config, such as the
 * event table of a module that reads a pattern; never carried) and `__seed` (the patch
 * seed or the node's local seed, which `hashRandom(key)` in a tick reads).
 * A re-eval then carries old values into these states
 * (hand-over/carry-states.ts).
 */

import { streamSeed } from "../random/stream-seed";
import type { ModuleSpec, PNode } from "../types";
import { freshLaneState } from "./fresh-lane-state";

/**
 * The stream identity of a node with its own `.seed(n)`: a constant, so code
 * edits that change the node's identity do not change its randomness (§7).
 */
const LOCAL_SEED_KEY = "seed";

export function freshNodeStates(
	node: PNode,
	spec: ModuleSpec,
	sampleRate: number,
	patchSeed: number,
	key: string,
): Record<string, unknown>[] {
	const seed = nodeSeed(node, patchSeed);
	const streamKey = node.seed === undefined ? key : LOCAL_SEED_KEY;
	return node.lanes.map((_, lane) => {
		const state = freshLaneState(spec, sampleRate, streamSeed(seed, streamKey, lane));
		state.__lane = lane;
		state.__seed = seed;
		return state;
	});
}

/** The seed a node's streams and `hashRandom` follow: its local seed, else the patch seed. */
export function nodeSeed(node: PNode, patchSeed: number): number {
	return node.seed ?? patchSeed;
}
