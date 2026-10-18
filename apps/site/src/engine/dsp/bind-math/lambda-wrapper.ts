/**
 * The JS text of a bound lambda (bind-lambda-math.ts): an expression that
 * declares the math helpers the lambda reaches and its call cache
 * (cache-names.ts), and returns the lambda. Each evaluation makes its own
 * cache. A lambda that calls no auxlang math is its own text.
 */

import type { BoundLambda } from "../../types";
import { CACHE_ARRAY, cacheArray } from "./cache-names";
import { mathHelpers } from "./math-helpers";

export function lambdaWrapper(bound: BoundLambda): string {
	if (bound.math.length === 0) return bound.fn;
	const helpers = Object.entries(mathHelpers(bound.math)).map(([name, fn]) => `const ${name} = ${fn};`);
	return `(() => {\n${helpers.join("\n")}\n${cacheArray(CACHE_ARRAY, bound.slots)}\nreturn (${bound.fn});\n})()`;
}
