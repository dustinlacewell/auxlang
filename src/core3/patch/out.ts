/**
 * `out()` — the only effect in the language. Creates an `out` module node
 * fed by the given source and registers it as a root of the current eval.
 */

import { getModule } from "../module/define";
import type { GNode, InputValue } from "../graph/node";
import { evalCtx } from "./context";
import { lift } from "./lift";

/** Shared by the standalone `out(x)` and the handle's `.out()`. */
export function addRoot(src: InputValue): void {
	const ctx = evalCtx("out()");
	const spec = getModule("out");
	const node: GNode = { module: "out", inputs: { [spec.defaultIn]: src }, config: {} };
	ctx.roots.push(node);
}

export function out(value: unknown): void {
	addRoot(lift(value, "out()"));
}
