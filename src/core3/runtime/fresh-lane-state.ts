/**
 * A fresh lane state exactly as the engine builds it: the module's own
 * `spec.state(sampleRate)` plus the engine-injected random stream position
 * `__rng` (see random/stream-seed.ts, random/lib/next-rng.js) and a fresh
 * `__scratch` (see fresh-node-states.ts; bridge/lane-table.ts for a module
 * that reads a pattern). A re-eval copies carried values into these states,
 * `__rng` included, so a carried stream continues where it was
 * (hand-over/carry-states.ts). A node's lanes pass the pattern queries they
 * share; a lane alone has its own.
 */

import { freshScratch } from "../bridge/lane-table";
import type { CycleQueries } from "../pattern/table/cycle-queries";
import type { ModuleSpec } from "../types";

export function freshLaneState(
	spec: ModuleSpec,
	sampleRate: number,
	rng: number,
	queries?: CycleQueries,
	config?: Record<string, unknown>,
): Record<string, unknown> {
	const state = spec.state ? spec.state(sampleRate, { ...spec.config, ...config }) : {};
	state.__rng = rng;
	state.__scratch = freshScratch(spec, queries);
	return state;
}
