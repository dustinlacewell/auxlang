/**
 * A signal lambda `(s, sr, t) => n` is a stateless module (MANIFESTO §5.1):
 * the same subset as a tick, with no helpers, no state fields and no random
 * stream. A closure over a patch variable is a loud error here, at eval.
 */

import { checkFunction } from "./check-function";

export function checkLambda(src: string): void {
	checkFunction({
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
}
