/**
 * A fresh lane state exactly as the engine builds it: the module's own
 * `spec.state(sampleRate)` plus the engine-injected random stream position
 * `__rng` (see random/stream-seed.ts, random/next-random.ts). Migrated state
 * never comes through here, so its stream continues where it was.
 */

import type { ModuleSpec } from "../types";

export function freshLaneState(
	spec: ModuleSpec,
	sampleRate: number,
	rng: number,
): Record<string, unknown> {
	const state = spec.state ? spec.state(sampleRate) : {};
	state.__rng = rng;
	return state;
}
