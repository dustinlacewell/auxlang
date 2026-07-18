/**
 * moduleFactory — turns a ModuleSpec into the user-facing callable:
 * `tosc(440)`, `lpf({ cutoff: 800 })`, positionals per spec.positional.
 * Only usable inside runEval (buildNode enforces it).
 */

import type { ModuleSpec } from "../types";
import { buildNode } from "./build-node";
import { wrap } from "./handle";
import type { Handle } from "./handle-data";

export function moduleFactory(spec: ModuleSpec): (...args: unknown[]) => Handle {
	return (...args: unknown[]) => wrap(buildNode(spec, args));
}
