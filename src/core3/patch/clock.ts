/**
 * `clock(bpm)` — the clock factory for host code (the user scope gets the
 * registry's own `clock` factory; this is the same thing, named for import).
 * It makes a clock and nothing else: the ambient clock is set only by
 * `tempo(bpm)` (patch/tempo.ts). Extra clocks are for polytempo.
 */

import { getModule } from "../module/define";
import { buildNode } from "./build-node";
import { wrap } from "./handle";
import type { Handle } from "./handle-data";

export function clock(...args: unknown[]): Handle {
	return wrap(buildNode(getModule("clock"), args));
}
