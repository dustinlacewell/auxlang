/**
 * auxlang's math as host functions, built from the same helper text a tick
 * runs, by the same `new Function` path. For tests and for host code that
 * must agree with the engine bit for bit.
 */

import { MATH_HELPER_PREFIX, mathFunctionNames, mathHelpers } from "./math-helpers";

export type MathFunction = (...args: number[]) => number;

let built: Readonly<Record<string, MathFunction>> | null = null;

/** Every library function by its plain name (`sin`, `exp2`, `kernelSin`, ...). */
export function mathFunctions(): Readonly<Record<string, MathFunction>> {
	built ??= build(mathFunctionNames());
	return built;
}

function build(names: readonly string[]): Record<string, MathFunction> {
	const helpers = mathHelpers(names);
	const declarations = Object.entries(helpers).map(([name, text]) => `const ${name} = ${text};`);
	const table = names.map((name) => `${JSON.stringify(name)}: ${MATH_HELPER_PREFIX}${name}`);
	const body = `"use strict";\n${declarations.join("\n")}\nreturn { ${table.join(", ")} };`;
	return new Function(body)() as Record<string, MathFunction>;
}
