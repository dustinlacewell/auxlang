/**
 * Build the tick the engine runs from the module's source text — the one
 * path for every module, built-in and patch-defined, on the main thread and
 * in the worklet. The helpers become constants in the tick's scope. The
 * source is already bound: its randomness and auxlang math are helper calls
 * (bind-random/, bind-math/), and the rest of `Math.*` is exact host math.
 * Only the table intrinsics are bound here, because each backend binds them
 * its own way (bind-table.ts for JS).
 *
 * The text compiles once, to a factory: each call makes a tick with its own
 * helpers and its own math call cache array (bind-math/cache-names.ts), all
 * sharing one compiled function. The tick returned is the factory's first;
 * a module with a cache registers its factory (tick-factories.ts), so a
 * generated driver can give each lane its own.
 */

import { fillLaneTable } from "../../bridge/lane-table";
import type { ModuleSource, ReduceTickFn, TickFn } from "../../types";
import { CACHE_ARRAY, cacheArray, cacheSize } from "../bind-math/cache-names";
import { parseFunction } from "../front/parse/parse-function";
import { TABLE_FILL, bindTable } from "./bind-table";
import { applyEdits } from "./text-edits";
import { registerTickFactory } from "./tick-factories";

type Tick = TickFn | ReduceTickFn;

export function buildTick(source: ModuleSource, what: string): Tick {
	const parsed = parseFunction(source.tick, `${what} tick`);
	const tick = applyEdits(parsed.expression, bindTable(parsed));
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
		factory = new Function(TABLE_FILL, body)(fillLaneTable);
		first = factory();
	} catch (err) {
		throw new Error(`${what}: tick failed to build: ${String(err)}`);
	}
	if (slots > 0) registerTickFactory(first, factory);
	return first;
}
