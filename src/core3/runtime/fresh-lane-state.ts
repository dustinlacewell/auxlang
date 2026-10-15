/**
 * A fresh lane state exactly as the engine builds it: the module's own
 * `spec.state(sampleRate)` plus the engine-injected random stream position
 * `__rng` (see random/stream-seed.ts, random/lib/next-rng.js) and an empty
 * `__scratch` (see fresh-node-states.ts). A re-eval copies carried values
 * into these states, `__rng` included, so a carried stream continues where
 * it was (hand-over/carry-states.ts).
 */

import type { ModuleSpec } from "../types";

export function freshLaneState(
	spec: ModuleSpec,
	sampleRate: number,
	rng: number,
): Record<string, unknown> {
	const state = spec.state ? spec.state(sampleRate) : {};
	state.__rng = rng;
	state.__scratch = {};
	return state;
}
