/**
 * auxlang's random library (random/lib/) as tick helpers, each named
 * `__random_<name>` (helper-library/helper-library.ts). One text for every
 * backend: the interpreter runs it as JS, the WASM backend
 * compiles it, and the host (random-functions.ts) builds it for the pattern
 * engine and the stream seeds.
 */

import { randomSources } from "../../random/random-sources";
import { helperLibrary } from "../helper-library/helper-library";

/** The prefix of a random helper's name; module helpers may not use it. */
export const RANDOM_HELPER_PREFIX = "__random_";

const random = helperLibrary("random/lib", RANDOM_HELPER_PREFIX, randomSources);

/** The helpers (helper name → text) for library functions `names` and all they call. */
export function randomHelpers(names: Iterable<string>): Record<string, string> {
	return random.helpers(names);
}

/** Every library function's name. */
export function randomFunctionNames(): string[] {
	return random.names();
}
