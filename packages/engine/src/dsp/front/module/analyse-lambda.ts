/**
 * Read a signal lambda `(s, sr, t) => n` once: a stateless module with no
 * ports, no state fields and no table. A bound lambda calls library helpers
 * by name (`helpers`); a written one calls none.
 */

import { parsePart } from "../parse/parse-part";
import { analyseFunction, resolvePart } from "./analyse-function";
import type { FunctionIR } from "./module-ir";

const NONE: ReadonlySet<string> = new Set();

export function analyseLambda(src: string, helpers: ReadonlySet<string> = NONE): FunctionIR {
	const part = resolvePart(parsePart({ owner: "lambda", part: "lambda", src }), helpers);
	return analyseFunction(part, {
		kind: "lambda",
		helpers,
		ins: NONE,
		outs: NONE,
		inGroups: NONE,
		outGroups: NONE,
		state: {},
		tables: false,
	});
}
