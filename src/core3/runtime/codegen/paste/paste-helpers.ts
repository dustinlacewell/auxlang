/**
 * A module's helpers, pasted once per driver as plain functions beside it,
 * under generated names. A helper has no object parameters and no random
 * stream, so it pastes as a whole function and V8 inlines it where small.
 *
 * A helper set that keeps math call caches (bind-math/cache-names.ts) pastes
 * its module helpers inside a factory instead: each call makes the helpers
 * anew around their own cache array, so each pasted lane calls its own
 * instance (emit-pasted-node.ts) and lanes never evict each other's cached
 * results. The math library helpers hold no caches and stay shared.
 */

import { CACHE_ARRAY, cacheArray, cacheSize } from "../../../module/bind-math/cache-names";
import { MATH_HELPER_PREFIX } from "../../../module/bind-math/math-helpers";
import type { NameTable } from "../name-table";
import { functionNames } from "./function-names";
import type { ParseCache } from "./parse-cache";
import type { PasteContext } from "./paste-context";
import { printBody } from "./print-body";

/** A helper set's factory: each call returns the instanced helpers' functions, in `helpers` order. */
export interface HelperFactory {
	readonly name: string;
	readonly helpers: readonly string[];
}

export interface PastedHelpers {
	/** Helper name → pasted function name (inside the factory, for instanced helpers). */
	readonly names: ReadonlyMap<string, string>;
	/** The names the helpers unit returns: shared helpers, then the factory. */
	readonly unitNames: readonly string[];
	readonly factory: HelperFactory | null;
	readonly lines: readonly string[];
}

export function pasteHelpers(
	helpers: Readonly<Record<string, string>>,
	names: NameTable,
	trees: ParseCache,
): PastedHelpers {
	const size = cacheSize(Object.values(helpers).map((src) => trees.parse(src)));
	const set: HelperSet = {
		texts: helpers,
		pasted: new Map(Object.keys(helpers).map((h) => [h, names.fresh()])),
		cache: { name: size === 0 ? "" : names.fresh(), size },
		names,
		trees,
	};
	const all = Object.keys(helpers);
	if (set.cache.size === 0) {
		const lines = all.flatMap((h) => pasteHelper(h, set));
		return { names: set.pasted, unitNames: [...set.pasted.values()], factory: null, lines };
	}
	const shared = all.filter((h) => h.startsWith(MATH_HELPER_PREFIX));
	const factory = {
		name: names.fresh(),
		helpers: all.filter((h) => !h.startsWith(MATH_HELPER_PREFIX)),
	};
	const lines = [...shared.flatMap((h) => pasteHelper(h, set)), ...factoryLines(factory, set)];
	const unitNames = [...shared.map((h) => set.pasted.get(h) as string), factory.name];
	return { names: set.pasted, unitNames, factory, lines };
}

/** One helper set being pasted. */
interface HelperSet {
	readonly texts: Readonly<Record<string, string>>;
	/** Helper name → pasted function name. */
	readonly pasted: ReadonlyMap<string, string>;
	/** The set's math cache array: its generated name and its slot count (0: none). */
	readonly cache: { readonly name: string; readonly size: number };
	readonly names: NameTable;
	readonly trees: ParseCache;
}

/** The factory: the cache array, the instanced helpers around it, and a return of those helpers. */
function factoryLines(factory: HelperFactory, set: HelperSet): string[] {
	const returned = factory.helpers.map((h) => set.pasted.get(h) as string);
	return [
		`function ${factory.name}() {`,
		cacheArray(set.cache.name, set.cache.size),
		...factory.helpers.flatMap((h) => pasteHelper(h, set)),
		`return [${returned.join(", ")}];`,
		"}",
	];
}

function pasteHelper(helper: string, set: HelperSet): string[] {
	const fn = set.trees.parse(set.texts[helper] as string);
	const declared = functionNames(fn, new Set(set.pasted.keys()));
	const locals = new Map(
		[...declared.params, ...declared.locals].map((n) => [n, set.names.fresh()]),
	);
	if (set.cache.size > 0) locals.set(CACHE_ARRAY, set.cache.name);
	const ctx: PasteContext = {
		names: set.names,
		locals,
		labels: new Map(),
		roles: {},
		fields: null,
		helpers: set.pasted,
		exit: null,
		cacheSlot: null,
	};
	const params = declared.params.map((p) => locals.get(p) as string);
	const name = set.pasted.get(helper) as string;
	return [`function ${name}(${params.join(", ")}) {`, ...printBody(fn, ctx), "}"];
}
