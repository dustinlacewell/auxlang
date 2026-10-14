/**
 * The only two ways a value enters generated driver source. Numbers become
 * exact literals (JS number-to-string round-trips every double; -0 needs its
 * own spelling). Property keys become JSON string literals, so a port name
 * from a patch-defined module can never break out of the expression.
 */

export function numLiteral(v: unknown): string {
	if (typeof v !== "number") {
		throw new Error(`codegen: expected a numeric constant, got ${typeof v}`);
	}
	return Object.is(v, -0) ? "-0" : String(v);
}

export function propKey(name: string): string {
	return `[${JSON.stringify(name)}]`;
}
