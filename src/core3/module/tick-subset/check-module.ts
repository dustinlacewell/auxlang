/**
 * The tick subset check for one module (MANIFESTO §5.1), run at eval for
 * every module, built-in and patch-defined: the tick and each helper are
 * checked against the module's real ports and real fresh state (whose
 * arrays must be typed and fields numbers, check-state.ts) — a helper that
 * receives the state record checks it as the tick does
 * (helper-state-params.ts) — then the
 * helpers' call graph is checked for recursion and the whole for booleans
 * kept as numbers (kinds/check-kinds.ts).
 */

import type { ModuleSource, ModuleSpec } from "../../types";
import {
	type CheckedFunction,
	type FunctionCheck,
	type ParsedPart,
	checkFunction,
	parsePart,
} from "./check-function";
import { checkStateValues } from "./check-state";
import { assertNoRecursion } from "./helper-cycles";
import { helperStateParams } from "./helper-state-params";
import { checkModuleKinds } from "./kinds/check-kinds";

/** Names a helper may not take: they are the tick's own bindings. */
const RESERVED_HELPER_NAMES = new Set(["Math", "hashRandom", "undefined", "NaN", "Infinity"]);

/** The rate used to build a sample fresh state; shapes do not depend on it. */
const SHAPE_SAMPLE_RATE = 48000;

export function checkModule(spec: ModuleSpec, source: ModuleSource): void {
	const owner = `defmod('${spec.name}')`;
	const shared = sharedCheck(spec, source, owner);
	const tick = checkFunction({ ...shared, kind: "tick", src: source.tick, part: "tick" });
	const parsed = new Map<string, ParsedPart>();
	for (const [name, src] of Object.entries(source.helpers))
		parsed.set(name, parsePart({ owner, src, part: `helper '${name}'` }));
	const stateParams = helperStateParams(tick, parsed);
	const helpers = new Map<string, CheckedFunction>();
	for (const [name, src] of Object.entries(source.helpers)) {
		const stateParam = stateParams.get(name);
		helpers.set(
			name,
			checkFunction({
				...shared,
				kind: "helper",
				src,
				part: `helper '${name}'`,
				parsed: parsed.get(name) as ParsedPart,
				...(stateParam === undefined ? {} : { stateParam }),
			}),
		);
	}
	assertNoRecursion(helpers);
	checkModuleKinds({ tick, helpers, state: shared.state, config: spec.config ?? {} });
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
	const own = spec.state?.(SHAPE_SAMPLE_RATE) ?? {};
	checkStateValues(own, owner);
	return {
		owner,
		helpers,
		ins: new Set(Object.keys(spec.ins)),
		outs: new Set(Object.keys(spec.outs)),
		state: tickState(own),
		tables: spec.reads === "pattern",
	};
}

/**
 * The state a tick sees: the module's own fresh state plus the fields the
 * engine injects into every lane (runtime/fresh-node-states.ts).
 */
function tickState(own: Record<string, unknown>): Record<string, unknown> {
	return { ...own, __rng: 1, __lane: 0, __seed: 0 };
}
