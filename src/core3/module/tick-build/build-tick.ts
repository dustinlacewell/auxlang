/**
 * Build the tick the engine runs from the module's source text — the one
 * path for every module, built-in and patch-defined, on the main thread and
 * in the worklet. The helpers become constants in the tick's scope, and the
 * tick's randomness is routed through its state (bind-random.ts). The rest of
 * `Math.*` is host math.
 */

import { hashRandom } from "../../random/hash-random";
import { nextRandom } from "../../random/next-random";
import type { ModuleSource, ReduceTickFn, TickFn } from "../../types";
import { parseFunction } from "../tick-subset/parse-function";
import { RANDOM_DRAW, bindRandom } from "./bind-random";

export function buildTick(source: ModuleSource, what: string): TickFn | ReduceTickFn {
	const tick = bindRandom(parseFunction(source.tick, `${what} tick`));
	const helpers = Object.entries(source.helpers).map(
		([name, src]) =>
			`const ${name} = ${parseFunction(src, `${what} helper '${name}'`).expression};`,
	);
	const body = `"use strict";\n${helpers.join("\n")}\nreturn ${tick};`;
	try {
		return new Function(RANDOM_DRAW, "hashRandom", body)(nextRandom, hashRandom);
	} catch (err) {
		throw new Error(`${what}: tick failed to build: ${String(err)}`);
	}
}
