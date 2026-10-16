/**
 * Read a library of helpers with no tick (auxlang's math and random
 * libraries, the WASM runtime functions): each helper checked against the
 * library's names alone, with no ports, no state and no table, and no
 * recursion among them.
 */

import { analyseHelpers, resolveHelpers } from "./analyse-helpers";
import { assertNoRecursion } from "./helper-cycles";
import type { FunctionIR } from "./module-ir";

const NONE: ReadonlySet<string> = new Set();

export function analyseLibrary(
	owner: string,
	texts: Readonly<Record<string, string>>,
): ReadonlyMap<string, FunctionIR> {
	const names = new Set(Object.keys(texts));
	const facts = { helpers: names, ins: NONE, outs: NONE, state: {}, tables: false };
	const helpers = analyseHelpers(resolveHelpers(texts, owner, names), facts, new Map());
	assertNoRecursion(helpers);
	return helpers;
}
