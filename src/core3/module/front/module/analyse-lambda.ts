/**
 * Read a signal lambda `(s, sr, t) => n` once: a stateless module with no
 * helpers, no ports, no state fields and no table.
 */

import { parsePart } from "@/core3/module/front/parse/parse-part";
import { analyseFunction, resolvePart } from "./analyse-function";
import type { FunctionIR } from "./module-ir";

const NONE: ReadonlySet<string> = new Set();

export function analyseLambda(src: string): FunctionIR {
	const part = resolvePart(parsePart({ owner: "lambda", part: "lambda", src }), NONE);
	return analyseFunction(part, {
		kind: "lambda",
		helpers: NONE,
		ins: NONE,
		outs: NONE,
		state: {},
		tables: false,
	});
}
