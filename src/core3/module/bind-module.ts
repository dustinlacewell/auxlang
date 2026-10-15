/**
 * From the spec `defmod` receives to the spec the engine runs. The tick and
 * helpers are read back as source text, checked against the tick subset,
 * bound to auxlang's math (bind-math/) and random library (bind-random/),
 * and the tick is rebuilt from that
 * text with its names bound. The bound source text is kept on the spec
 * (`source`): it is what crosses to the worklet and what the codegen pastes.
 */

import type { ModuleSource, ModuleSpec } from "../types";
import { bindModuleMath } from "./bind-math/bind-module-math";
import { MATH_HELPER_PREFIX } from "./bind-math/math-helpers";
import { bindModuleRandom } from "./bind-random/bind-module-random";
import { RANDOM_HELPER_PREFIX } from "./bind-random/random-helpers";
import { buildTick } from "./tick-build/build-tick";
import { checkModule } from "./tick-subset/check-module";
import { EXEMPT_MODULES } from "./tick-subset/exempt";

/** A spec as written: `helpers` are functions the tick may call by name. */
export interface WrittenSpec extends ModuleSpec {
	readonly helpers?: Readonly<Record<string, (...args: never[]) => unknown>>;
}

export function bindModule(written: WrittenSpec): ModuleSpec {
	const { helpers, ...spec } = written;
	if (EXEMPT_MODULES.has(spec.name)) return spec;
	const owner = `defmod('${spec.name}')`;
	const written_ = sourceOf(written.tick, helpers ?? {}, owner);
	checkModule(spec, written_);
	const source = bindModuleRandom(bindModuleMath(written_, owner), owner);
	return { ...spec, tick: buildTick(source, owner), source };
}

const RESERVED_PREFIXES = [MATH_HELPER_PREFIX, RANDOM_HELPER_PREFIX];

function sourceOf(
	tick: ModuleSpec["tick"],
	helpers: Readonly<Record<string, (...args: never[]) => unknown>>,
	owner: string,
): ModuleSource {
	const texts: Record<string, string> = {};
	for (const [name, fn] of Object.entries(helpers)) {
		const prefix = RESERVED_PREFIXES.find((p) => name.startsWith(p));
		if (prefix !== undefined)
			throw new Error(
				`${owner}: helper names starting with '${prefix}' are reserved for auxlang's library`,
			);
		texts[name] = fn.toString();
	}
	return { tick: tick.toString(), helpers: texts };
}
