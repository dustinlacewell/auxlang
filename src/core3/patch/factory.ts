/**
 * moduleFactory — turns a module's port surface into the user-facing callable:
 * `tosc(440)`, `lpf({ cutoff: 79 })`, positionals per spec.positional.
 * Only usable inside runEval (buildNode enforces it).
 */

import type { ModulePorts } from "../types";
import { buildNode } from "./build-node";
import { wrap } from "./handle";
import type { Handle } from "./handle-data";

export function moduleFactory(spec: ModulePorts): (...args: unknown[]) => Handle {
	return (...args: unknown[]) => wrap(buildNode(spec, args));
}
