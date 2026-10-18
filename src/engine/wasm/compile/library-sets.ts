/**
 * The helper sets every program shares: auxlang's math and random libraries
 * (by their helper name prefix, read by the front end: library-irs.ts) and
 * the runtime functions, read once per process on first use.
 */

import { analyseLibrary } from "../../module/front/module/analyse-library";
import { libraryIrs } from "../../module/front/module/library-irs";
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
		libraries: libraryIrs().map((l) => [l.prefix, helperSet(l.owner, l.fns)] as const),
		runtime: helperSet("runtime", analyseLibrary("runtime", RUNTIME_SOURCES)),
	};
	return sets;
}
