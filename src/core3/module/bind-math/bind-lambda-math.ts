/**
 * Bind a signal lambda's math. A lambda crosses to the engine as source text
 * that evaluates to the function, so the bound text is an expression that
 * declares the math helpers it reaches and returns the rewritten lambda.
 * A lambda that uses no auxlang math is returned unchanged.
 */

import { mathHelpers } from "./math-helpers";
import { rewriteMath } from "./rewrite-math";

export function bindLambdaMath(src: string): string {
	const { text, uses } = rewriteMath(src, "lambda");
	if (uses.size === 0) return src;
	const helpers = Object.entries(mathHelpers(uses)).map(([name, fn]) => `const ${name} = ${fn};`);
	return `(() => {\n${helpers.join("\n")}\nreturn (${text});\n})()`;
}
