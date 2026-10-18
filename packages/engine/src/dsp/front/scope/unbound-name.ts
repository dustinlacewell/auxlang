/**
 * What a name no scope binds means: a global constant, the bound math cache,
 * `Math`, one of the module's helpers, an intrinsic, or nothing.
 */

import { CACHE_ARRAY } from "../../bind-math/cache-names";
import { TABLE_INTRINSICS } from "../intrinsics/table-intrinsics";
import type { Resolution } from "./binding";

const GLOBALS = new Set(["undefined", "NaN", "Infinity", CACHE_ARRAY]);

export function unboundName(name: string, helpers: ReadonlySet<string>): Resolution {
	if (GLOBALS.has(name)) return { k: "global", name };
	if (name === "Math") return { k: "math" };
	if (helpers.has(name)) return { k: "helper", name };
	if (name === "hashRandom" || TABLE_INTRINSICS.has(name)) return { k: "intrinsic", name };
	return { k: "free", name };
}
