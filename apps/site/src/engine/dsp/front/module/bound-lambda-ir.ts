/**
 * Read a bound lambda (types.ts `BoundLambda`) once: its function text, with
 * its math calls resolved to the `__math_<name>` library helpers it names.
 */

import { MATH_HELPER_PREFIX } from "@/engine/dsp/bind-math/math-helpers";
import type { BoundLambda } from "@/engine/types";
import { analyseLambda } from "./analyse-lambda";
import type { FunctionIR } from "./module-ir";

export function boundLambdaIR(bound: BoundLambda): FunctionIR {
	return analyseLambda(bound.fn, new Set(bound.math.map((name) => MATH_HELPER_PREFIX + name)));
}
