/**
 * Build the tick the engine runs from the module's source text — the one
 * path for every module, built-in and patch-defined, on the main thread and
 * in the worklet. The helpers become constants in the tick's scope, and the
 * tick's randomness is routed through its state (bind-random.ts). The rest of
 * `Math.*` is exact host math.
 *
 * The text compiles once, to a factory: each call makes a tick with its own
 * helpers and its own math call cache array (bind-math/cache-names.ts), all
 * sharing one compiled function. The tick returned is the factory's first;
 * a module with a cache registers its factory (tick-factories.ts), so a
 * generated driver can give each lane its own.
 */

import { hashRandom } from "../../random/hash-random";
import { nextRandom } from "../../random/next-random";
import type { ModuleSource, ReduceTickFn, TickFn } from "../../types";
import { CACHE_ARRAY, cacheArray, cacheSize } from "../bind-math/cache-names";
import { parseFunction } from "../tick-subset/parse-function";
import { RANDOM_DRAW, bindRandom } from "./bind-random";
import { registerTickFactory } from "./tick-factories";

type Tick = TickFn | ReduceTickFn;

export function buildTick(source: ModuleSource, what: string): Tick {
	const parsed = parseFunction(source.tick, `${what} tick`);
	const tick = bindRandom(parsed);
	const fns = [parsed.node];
	const helpers = Object.entries(source.helpers).map(([name, src]) => {
		const helper = parseFunction(src, `${what} helper '${name}'`);
		fns.push(helper.node);
		return `const ${name} = ${helper.expression};`;
	});
	const slots = cacheSize(fns);
	const cache = slots === 0 ? [] : [cacheArray(CACHE_ARRAY, slots)];
	const body = `"use strict";\nreturn function () {\n${[...cache, ...helpers].join("\n")}\nreturn ${tick};\n};`;
	let factory: () => Tick;
	let first: Tick;
	try {
		factory = new Function(RANDOM_DRAW, "hashRandom", body)(nextRandom, hashRandom);
		first = factory();
	} catch (err) {
		throw new Error(`${what}: tick failed to build: ${String(err)}`);
	}
	if (slots > 0) registerTickFactory(first, factory);
	return first;
}
