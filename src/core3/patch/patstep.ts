/**
 * `patstep(pattern, trig?)` — the trigger-domain step-sequencer factory
 * (platonic.md §4.4: patterns advanced by trigger, not phase). The pattern is
 * static config; connect a trigger positionally, as `{ trig }`, via `.trig(t)`,
 * or by chaining from a trig tap.
 */

import { getModule } from "../module/define";
import { buildNode } from "./build-node";
import { evalCtx } from "./context";
import { wrap } from "./handle";
import type { Handle } from "./handle-data";
import { patternAst } from "./pattern-arg";

export function patstep(pattern: unknown, ...rest: unknown[]): Handle {
	const ctx = evalCtx("patstep(...)");
	const node = buildNode(getModule("patstep"), rest);
	node.config.pattern = patternAst(pattern, "patstep(pattern)");
	node.config.seed = ctx.seed;
	return wrap(node);
}
