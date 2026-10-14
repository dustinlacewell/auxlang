/**
 * A seq node's pattern config: the pattern voiced (default policy `packed`
 * unless it carries its own `.voices(...)`), its lane count from structure
 * (floored at 1), and the program seed. `__minWidth` is the compile hint that
 * makes the node at least as wide as the pattern; a wider position widens it
 * further (MANIFESTO §4: width = max(pattern, position)).
 */

import type { Pat } from "../pattern/ast";
import { voices } from "../pattern/combinators";
import { width } from "../pattern/widths";

export function seqConfig(pattern: Pat, seed: number): Record<string, unknown> {
	const voiced = pattern.op === "voices" ? pattern : voices("packed", undefined, pattern);
	const lanes = Math.max(1, width(voiced));
	return { pattern: voiced, seed, lanes, __minWidth: lanes };
}
