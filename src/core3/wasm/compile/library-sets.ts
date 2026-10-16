/**
 * The helper sets every program shares, read by the front end once per
 * process on first use: auxlang's math and random libraries (by their helper
 * name prefix) and the runtime functions.
 */

import { analyseLibrary } from "../../module/front/module/analyse-library";
import {
	MATH_HELPER_PREFIX,
	mathFunctionNames,
	mathHelpers,
} from "../../module/bind-math/math-helpers";
import {
	RANDOM_HELPER_PREFIX,
	randomFunctionNames,
	randomHelpers,
} from "../../module/bind-random/random-helpers";
import { RUNTIME_SOURCES } from "../runtime/runtime-sources";
import { type HelperSet, helperSet } from "./helper-set";

export interface LibrarySets {
	/** Each library with the prefix its helper names start with. */
	readonly libraries: readonly (readonly [string, HelperSet])[];
	readonly runtime: HelperSet;
}

let sets: LibrarySets | null = null;

export function librarySets(): LibrarySets {
	sets ??= {
		libraries: [
			[MATH_HELPER_PREFIX, library("math", mathHelpers(mathFunctionNames()))],
			[RANDOM_HELPER_PREFIX, library("random", randomHelpers(randomFunctionNames()))],
		],
		runtime: library("runtime", RUNTIME_SOURCES),
	};
	return sets;
}

function library(owner: string, texts: Readonly<Record<string, string>>): HelperSet {
	return helperSet(owner, analyseLibrary(owner, texts));
}
