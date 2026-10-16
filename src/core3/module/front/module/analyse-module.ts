/**
 * Read one module's tick code once (Stage A): parse the tick and each helper,
 * resolve their names, check the tick, find the helper parameters that take
 * the state record, check the helpers, and refuse recursion in their call
 * graph.
 */

import type { ModuleSource } from "@/core3/types";
import { parsePart } from "@/core3/module/front/parse/parse-part";
import { analyseFunction, resolvePart } from "./analyse-function";
import { analyseHelpers, resolveHelpers } from "./analyse-helpers";
import { assertNoRecursion } from "./helper-cycles";
import { helperStateParams } from "./helper-state-params";
import type { ModuleFacts, ModuleIR } from "./module-ir";

/** Names a helper may not take: they are the tick's own bindings. */
const RESERVED_HELPER_NAMES = new Set(["Math", "hashRandom", "undefined", "NaN", "Infinity"]);

export function analyseModule(source: ModuleSource, facts: ModuleFacts): ModuleIR {
	const names = helperNames(source, facts.owner);
	const shared = { ...facts, helpers: names };
	const origins = source.origins ?? {};
	const tickSite = { ...facts, part: "tick", src: source.tick, origin: origins.tick };
	const tick = resolvePart(parsePart(tickSite), names);
	const tickIR = analyseFunction(tick, { ...shared, kind: "tick" });
	const resolved = resolveHelpers(source.helpers, facts.owner, names, origins);
	const helpers = analyseHelpers(resolved, shared, helperStateParams(tick, resolved));
	assertNoRecursion(helpers);
	return { tick: tickIR, helpers };
}

function helperNames(source: ModuleSource, owner: string): ReadonlySet<string> {
	const names = new Set(Object.keys(source.helpers));
	for (const name of names) {
		if (RESERVED_HELPER_NAMES.has(name))
			throw new Error(`${owner}: helper '${name}' would hide the tick's own '${name}'`);
	}
	return names;
}
