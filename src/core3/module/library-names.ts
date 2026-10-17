/**
 * The names auxlang's math and random libraries take in bound text: every
 * library function joins a module's helpers under its prefix
 * (bind-math/math-helpers.ts, bind-random/random-helpers.ts). Written code
 * may not use them, as a helper name or as a name in its text, or the front
 * end would read the author's name as the library's.
 */

import type { AnyNode } from "acorn";
import { MATH_HELPER_PREFIX } from "./bind-math/math-helpers";
import { RANDOM_HELPER_PREFIX } from "./bind-random/random-helpers";
import { walk } from "./front/parse/walk";

const LIBRARY_PREFIXES = [MATH_HELPER_PREFIX, RANDOM_HELPER_PREFIX, "__dsp_", "__sg_"];

/** The library prefix `name` starts with, if any. */
export function libraryPrefixOf(name: string): string | undefined {
	return LIBRARY_PREFIXES.find((p) => name.startsWith(p));
}

/** Throws when written source uses a library's name. */
export function assertNoLibraryNames(fn: AnyNode, what: string): void {
	walk(fn, (node) => {
		if (node.type !== "Identifier") return;
		const prefix = libraryPrefixOf(node.name);
		if (prefix !== undefined)
			throw new Error(
				`${what}: the name '${node.name}' is reserved: names starting with '${prefix}' are auxlang's library`,
			);
	});
}
