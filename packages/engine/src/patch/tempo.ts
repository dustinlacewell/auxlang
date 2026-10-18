/**
 * `tempo(bpm)` — a setting (MANIFESTO §6): makes a clock, sets it as the
 * eval's ambient clock, and returns it. Settings bind when eval finishes —
 * compile reads the ambient clock only after the whole patch has run — so
 * `tempo()` may appear anywhere in the code. A second `tempo()` in one eval
 * is a loud error.
 */

import { getModule } from "../dsp/define";
import { buildNode } from "./build-node";
import { evalCtx } from "./context";
import { wrap } from "./handle";
import type { Handle } from "./handle-data";

export function tempo(...args: unknown[]): Handle {
	const ctx = evalCtx("tempo()");
	if (ctx.clock !== null) {
		throw new Error("tempo() is a setting and may appear once per patch; remove the second call");
	}
	const node = buildNode(getModule("clock"), args);
	ctx.clock = node;
	return wrap(node);
}
