/**
 * Bind a module's randomness (bind-random.ts): the tick's `Math.random()`
 * and `hashRandom(key)` become calls of the random library, and the library
 * functions they reach join the module's helpers. Only a tick draws (the
 * subset check), so the helpers are left as they are.
 */

import type { ModuleSource } from "../../types";
import { bindRandom } from "./bind-random";
import { randomHelpers } from "./random-helpers";

export function bindModuleRandom(source: ModuleSource, owner: string): ModuleSource {
	const { text, uses } = bindRandom(source.tick, `${owner} tick`);
	if (uses.size === 0) return source;
	return { tick: text, helpers: { ...source.helpers, ...randomHelpers(uses) } };
}
