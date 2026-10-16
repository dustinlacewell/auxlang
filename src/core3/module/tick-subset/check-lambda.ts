/**
 * A signal lambda `(s, sr, t) => n` is a stateless module (MANIFESTO §5.1):
 * the same subset as a tick, with no helpers, no state fields and no random
 * stream (front/module/analyse-lambda.ts), and it returns a number
 * (kinds/check-kinds.ts). A closure over a patch variable is a loud error
 * here, at eval.
 */

import { analyseLambda } from "@/core3/module/front/module/analyse-lambda";
import type { FunctionIR } from "@/core3/module/front/module/module-ir";
import { checkLambdaKinds } from "./kinds/check-kinds";

export function checkLambda(src: string): FunctionIR {
	const lambda = analyseLambda(src);
	checkLambdaKinds(lambda);
	return lambda;
}
