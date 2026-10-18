/**
 * auxlang's math library (math/lib/) as tick helpers, each named
 * `__math_<name>` (helper-library/helper-library.ts). The checker holds the
 * text to the tick subset like any helper.
 */

import { mathSources } from "../../math/math-sources";
import { helperLibrary } from "../helper-library/helper-library";

/** The prefix of a math helper's name; module helpers may not use it. */
export const MATH_HELPER_PREFIX = "__math_";

const math = helperLibrary("math/lib", MATH_HELPER_PREFIX, mathSources);

/** The helpers (helper name → text) for library functions `names` and all they call. */
export function mathHelpers(names: Iterable<string>): Record<string, string> {
	return math.helpers(names);
}

/** Every library function's name. */
export function mathFunctionNames(): string[] {
	return math.names();
}
