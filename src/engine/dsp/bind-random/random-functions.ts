/**
 * auxlang's random library as host functions, built from the same helper
 * text a tick runs, by the same `new Function` path. The pattern engine, the
 * stream seeds and the host `hashRandom` call these, so every random value
 * comes from one source.
 */

import { RANDOM_HELPER_PREFIX, randomFunctionNames, randomHelpers } from "./random-helpers";

export interface RandomFunctions {
	/** One xorshift32 step on a u32 stream position. */
	readonly nextRng: (x: number) => number;
	/** murmur3's 32-bit finalizer; a u32. */
	readonly avalanche: (h: number) => number;
	/** A uniform value in [0, 1) for a u32 key under a seed. */
	readonly hashKey: (k: number, seed: number) => number;
	/** A uniform value in [0, 1) for a number key under a seed. */
	readonly hashNumber: (key: number, seed: number) => number;
}

export const randomFunctions: RandomFunctions = build(randomFunctionNames());

function build(names: readonly string[]): RandomFunctions {
	const helpers = randomHelpers(names);
	const declarations = Object.entries(helpers).map(([name, text]) => `const ${name} = ${text};`);
	const table = names.map((name) => `${JSON.stringify(name)}: ${RANDOM_HELPER_PREFIX}${name}`);
	const body = `"use strict";\n${declarations.join("\n")}\nreturn { ${table.join(", ")} };`;
	return new Function(body)() as RandomFunctions;
}
