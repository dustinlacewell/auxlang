/**
 * The reserved-name checks run once, at the author boundary: where a tick,
 * helper or setup's text first enters a rewrite (bind-math/rewrite-math.ts
 * no longer runs them on every function, since lowering's internal text
 * legitimately uses the names these checks reserve — `__dsp_*`,
 * `__mc*`). Parses `src` once and runs both checks against the author's
 * own code.
 */

import { parseFunction } from "./front/parse/parse-function";
import { assertNoLibraryNames } from "./library-names";
import { assertNoCacheNames } from "./bind-math/cache-names";

export function assertAuthorNames(src: string, what: string): void {
	const parsed = parseFunction(src, what);
	assertNoCacheNames(parsed.node, what);
	assertNoLibraryNames(parsed.node, what);
}
