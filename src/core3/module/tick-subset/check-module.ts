/**
 * The tick subset check for one module (MANIFESTO §5.1), run at eval for
 * every module, built-in and patch-defined: the tick and each helper are
 * checked against the module's real ports and real fresh state, then the
 * helpers' call graph is checked for recursion.
 */

import type { ModuleSource, ModuleSpec } from "../../types";
import { type CheckedFunction, type FunctionCheck, checkFunction } from "./check-function";
import { assertNoRecursion } from "./helper-cycles";

/** Names a helper may not take: they are the tick's own bindings. */
const RESERVED_HELPER_NAMES = new Set(["Math", "hashRandom", "undefined", "NaN", "Infinity"]);

/** The rate used to build a sample fresh state; shapes do not depend on it. */
const SHAPE_SAMPLE_RATE = 48000;

export function checkModule(spec: ModuleSpec, source: ModuleSource): void {
	const owner = `defmod('${spec.name}')`;
	const shared = sharedCheck(spec, source, owner);
	checkFunction({ ...shared, kind: "tick", src: source.tick, part: "tick" });
	const helpers = new Map<string, CheckedFunction>();
	for (const [name, src] of Object.entries(source.helpers)) {
		helpers.set(name, checkFunction({ ...shared, kind: "helper", src, part: `helper '${name}'` }));
	}
	assertNoRecursion(helpers);
}

function sharedCheck(
	spec: ModuleSpec,
	source: ModuleSource,
	owner: string,
): Omit<FunctionCheck, "kind" | "src" | "part"> {
	const helpers = new Set(Object.keys(source.helpers));
	for (const name of helpers) {
		if (RESERVED_HELPER_NAMES.has(name))
			throw new Error(`${owner}: helper '${name}' would hide the tick's own '${name}'`);
	}
	return {
		owner,
		helpers,
		ins: new Set(Object.keys(spec.ins)),
		outs: new Set(Object.keys(spec.outs)),
		state: freshState(spec),
	};
}

/**
 * The state a tick sees: the module's own fresh state plus the fields the
 * engine injects into every lane (runtime/fresh-node-states.ts).
 */
function freshState(spec: ModuleSpec): Record<string, unknown> {
	const own = spec.state?.(SHAPE_SAMPLE_RATE) ?? {};
	return { ...own, __rng: 1, __lane: 0, __seed: 0 };
}
