/**
 * A signal lambda `(s, sr, t) => n` is a stateless module (MANIFESTO §5.1):
 * the same subset as a tick, with no helpers, no state fields and no random
 * stream, and it returns a number (kinds/check-kinds.ts). A closure over a
 * patch variable is a loud error here, at eval.
 */

import { checkFunction } from "./check-function";
import { checkLambdaKinds } from "./kinds/check-kinds";

export function checkLambda(src: string): void {
	const lambda = checkFunction({
		kind: "lambda",
		src,
		owner: "lambda",
		part: "lambda",
		helpers: new Set(),
		ins: new Set(),
		outs: new Set(),
		state: {},
		tables: false,
	});
	checkLambdaKinds(lambda);
}
