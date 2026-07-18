/**
 * `clock(bpm)` — creates a clock node and binds it as the eval's AMBIENT
 * clock if none is bound yet (first call wins). Consumers that want a
 * different clock connect one explicitly; everyone else gets the ambient one
 * (pattern lifting wires patsig.phase to it at compile).
 */

import { getModule } from "../module/define";
import { buildNode } from "./build-node";
import { evalCtx } from "./context";
import { wrap } from "./handle";
import type { Handle } from "./handle-data";

export function clock(...args: unknown[]): Handle {
	const ctx = evalCtx("clock()");
	const node = buildNode(getModule("clock"), args);
	if (ctx.clock === null) ctx.clock = node;
	return wrap(node);
}
