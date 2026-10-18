/**
 * auxlang's math and random libraries, read by the front end once per
 * process on first use, each with the prefix its helper names start with.
 * A call to a name with a library's prefix is a call into that library,
 * whichever function makes it.
 */

import {
	MATH_HELPER_PREFIX,
	mathFunctionNames,
	mathHelpers,
} from "@/engine/module/bind-math/math-helpers";
import {
	RANDOM_HELPER_PREFIX,
	randomFunctionNames,
	randomHelpers,
} from "@/engine/module/bind-random/random-helpers";
import { analyseLibrary } from "./analyse-library";
import type { FunctionIR } from "./module-ir";

export interface LibraryIR {
	readonly prefix: string;
	readonly owner: string;
	readonly fns: ReadonlyMap<string, FunctionIR>;
}

let libraries: readonly LibraryIR[] | null = null;

export function libraryIrs(): readonly LibraryIR[] {
	libraries ??= [
		library(MATH_HELPER_PREFIX, "math", mathHelpers(mathFunctionNames())),
		library(RANDOM_HELPER_PREFIX, "random", randomHelpers(randomFunctionNames())),
	];
	return libraries;
}

/** The library a call to `name` goes to, if any. */
export function libraryFor(name: string): LibraryIR | undefined {
	return libraryIrs().find((l) => name.startsWith(l.prefix));
}

function library(prefix: string, owner: string, texts: Readonly<Record<string, string>>): LibraryIR {
	return { prefix, owner, fns: analyseLibrary(owner, texts) };
}
