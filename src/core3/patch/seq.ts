/**
 * `seq(pattern, clk?)` — the sequencer factory. The pattern (mini-notation
 * string | P | Pat data) is static config; width is pinned to
 * maxWidth(pattern), so ONE node carries all packed poly lanes. `clk`
 * defaults to the eval's ambient clock, resolved at compile (the mirror of
 * pattern lifting); pass a clock positionally, as `{ clk }`, or via `.clk(c)`
 * to override.
 */

import { getModule } from "../module/define";
import { maxWidth } from "../pattern/widths";
import { buildNode } from "./build-node";
import { evalCtx } from "./context";
import { wrap } from "./handle";
import type { Handle } from "./handle-data";
import { patternAst } from "./pattern-arg";

export function seq(pattern: unknown, ...rest: unknown[]): Handle {
	const ctx = evalCtx("seq(...)");
	const ast = patternAst(pattern, "seq(pattern)");
	const node = buildNode(getModule("seq"), rest);
	node.config.pattern = ast;
	node.config.seed = ctx.seed;
	node.config.__width = maxWidth(ast);
	return wrap(node);
}
