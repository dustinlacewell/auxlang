/**
 * `seq(pattern, position?)` — the bridge's factory for host code (the user
 * scope gets the registry's own `seq` factory; this is the same thing, named
 * for import). The pattern is config, the position the default input, so
 * chaining a position works too: `clock(90).seq("c3 e3")`,
 * `counter(t).seq(p)`. Compile prepares the pattern (compile/prepare-seqs)
 * and resolves an unconnected position to the ambient clock.
 */

import { getModule } from "../dsp/define";
import { buildNode } from "./build-node";
import { wrap } from "./handle";
import type { Handle } from "./handle-data";

export function seq(...args: unknown[]): Handle {
	return wrap(buildNode(getModule("seq"), args));
}
