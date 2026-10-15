/**
 * A module's helpers, pasted once per driver as plain functions beside it,
 * under generated names. A helper has no object parameters and no random
 * stream, so it pastes as a whole function and V8 inlines it where small.
 */

import type { NameTable } from "../name-table";
import { functionNames } from "./function-names";
import type { ParseCache } from "./parse-cache";
import type { PasteContext } from "./paste-context";
import { printBody } from "./print-body";

export interface PastedHelpers {
	/** Helper name → pasted function name. */
	readonly names: ReadonlyMap<string, string>;
	readonly lines: readonly string[];
}

export function pasteHelpers(
	helpers: Readonly<Record<string, string>>,
	names: NameTable,
	trees: ParseCache,
): PastedHelpers {
	const pasted = new Map(Object.keys(helpers).map((h) => [h, names.fresh()]));
	const lines = Object.entries(helpers).flatMap(([helper, src]) =>
		pasteHelper(pasted.get(helper) as string, src, pasted, names, trees),
	);
	return { names: pasted, lines };
}

function pasteHelper(
	name: string,
	src: string,
	helpers: ReadonlyMap<string, string>,
	names: NameTable,
	trees: ParseCache,
): string[] {
	const fn = trees.parse(src);
	const declared = functionNames(fn, new Set(helpers.keys()));
	const locals = new Map([...declared.params, ...declared.locals].map((n) => [n, names.fresh()]));
	const ctx: PasteContext = {
		names,
		locals,
		labels: new Map(),
		roles: {},
		fields: null,
		helpers,
		hashRandom: null,
		exit: null,
	};
	const params = declared.params.map((p) => locals.get(p) as string);
	return [`function ${name}(${params.join(", ")}) {`, ...printBody(fn, ctx), "}"];
}
