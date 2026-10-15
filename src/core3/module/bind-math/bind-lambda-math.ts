/**
 * Bind a signal lambda's math. A lambda crosses to the engine as source text
 * that evaluates to the function, so the bound text is an expression that
 * declares the math helpers it reaches and its call cache (cache-names.ts),
 * and returns the rewritten lambda. Each lambda occurrence is built on its
 * own, so each keeps its own cache. A lambda that uses no auxlang math is
 * returned unchanged.
 */

import { CACHE_ARRAY, cacheArray } from "./cache-names";
import { mathHelpers } from "./math-helpers";
import { rewriteMath } from "./rewrite-math";

export function bindLambdaMath(src: string): string {
	const { text, uses, slots } = rewriteMath(src, "lambda");
	if (uses.size === 0) return src;
	const helpers = Object.entries(mathHelpers(uses)).map(([name, fn]) => `const ${name} = ${fn};`);
	return `(() => {\n${helpers.join("\n")}\n${cacheArray(CACHE_ARRAY, slots)}\nreturn (${text});\n})()`;
}
