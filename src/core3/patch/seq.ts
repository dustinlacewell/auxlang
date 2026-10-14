/**
 * `seq(pattern, clk?)` — the sequencer factory. The pattern (mini-notation
 * string | P | Pat data) is static config. A pattern without its own
 * `.voices(...)` gets the default packed policy; the node's width is pinned to
 * the voices' lane count (from structure, floored at 1), so ONE node carries
 * every lane. `clk` defaults to the eval's ambient clock, resolved at compile
 * (the mirror of pattern lifting); pass a clock positionally, as `{ clk }`, or
 * via `.clk(c)` to override.
 */

import { getModule } from "../module/define";
import type { Pat } from "../pattern/ast";
import { voices } from "../pattern/combinators";
import { width } from "../pattern/widths";
import { buildNode } from "./build-node";
import { evalCtx } from "./context";
import { wrap } from "./handle";
import type { Handle } from "./handle-data";
import { patternAst } from "./pattern-arg";

export function seq(pattern: unknown, ...rest: unknown[]): Handle {
	const ctx = evalCtx("seq(...)");
	const voiced = withVoices(patternAst(pattern, "seq(pattern)"));
	const node = buildNode(getModule("seq"), rest);
	node.config.pattern = voiced;
	node.config.seed = ctx.seed;
	node.config.__width = Math.max(1, width(voiced));
	return wrap(node);
}

function withVoices(ast: Pat): Pat {
	return ast.op === "voices" ? ast : voices("packed", undefined, ast);
}
