/**
 * Read one module's tick code once (Stage A): parse the tick and each helper,
 * resolve their names, check the tick, find the helper parameters that take
 * the state record, check the helpers, and refuse recursion in their call
 * graph.
 */

import type { ModuleSource } from "@/core3/types";
import { parsePart } from "@/core3/module/front/parse/parse-part";
import { type FunctionFacts, analyseFunction, resolvePart } from "./analyse-function";
import { assertNoRecursion } from "./helper-cycles";
import { helperStateParams } from "./helper-state-params";
import type { FunctionIR, ModuleFacts, ModuleIR, ResolvedPart } from "./module-ir";

/** Names a helper may not take: they are the tick's own bindings. */
const RESERVED_HELPER_NAMES = new Set(["Math", "hashRandom", "undefined", "NaN", "Infinity"]);

export function analyseModule(source: ModuleSource, facts: ModuleFacts): ModuleIR {
	const names = helperNames(source, facts.owner);
	const shared = { ...facts, helpers: names };
	const tick = resolvePart(parsePart({ ...facts, part: "tick", src: source.tick }), names);
	const tickIR = analyseFunction(tick, { ...shared, kind: "tick" });
	const resolved = resolveHelpers(source, facts.owner, names);
	const stateParams = helperStateParams(tick, resolved);
	const helpers = new Map<string, FunctionIR>();
	for (const [name, part] of resolved)
		helpers.set(name, analyseFunction(part, { ...shared, kind: "helper" }, stateParams.get(name)));
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

function resolveHelpers(
	source: ModuleSource,
	owner: string,
	names: FunctionFacts["helpers"],
): Map<string, ResolvedPart> {
	const resolved = new Map<string, ResolvedPart>();
	for (const [name, src] of Object.entries(source.helpers))
		resolved.set(name, resolvePart(parsePart({ owner, part: `helper '${name}'`, src }), names));
	return resolved;
}
