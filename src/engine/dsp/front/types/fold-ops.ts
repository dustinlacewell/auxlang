/**
 * The JS operators applied to values known while compiling. Folding runs the
 * same IEEE operations the JS backend runs at sample time, so a folded value
 * has the same bits. An operator not listed folds to `undefined`.
 */

import type { StaticValue } from "./ty";

/* biome-ignore lint/suspicious/noExplicitAny: JS operator semantics on any static value. */
export function applyBinary(op: string, a: any, b: any): StaticValue {
	switch (op) {
		case "+":
			return a + b;
		case "-":
			return a - b;
		case "*":
			return a * b;
		case "/":
			return a / b;
		case "%":
			return a % b;
		case "<":
			return a < b;
		case ">":
			return a > b;
		case "<=":
			return a <= b;
		case ">=":
			return a >= b;
		case "===":
			return a === b;
		case "!==":
			return a !== b;
		case "==":
			// biome-ignore lint/suspicious/noDoubleEquals: folding the operator as written.
			return a == b;
		case "!=":
			// biome-ignore lint/suspicious/noDoubleEquals: folding the operator as written.
			return a != b;
		case "&":
			return a & b;
		case "|":
			return a | b;
		case "^":
			return a ^ b;
		case "<<":
			return a << b;
		case ">>":
			return a >> b;
		case ">>>":
			return a >>> b;
		default:
			return undefined;
	}
}

/** `! - + ~ void` on a known value; null for an operator that never folds this way. */
export function applyUnary(op: string, value: StaticValue): { v: StaticValue } | null {
	const v = value as number;
	switch (op) {
		case "!":
			return { v: !v };
		case "-":
			return { v: -v };
		case "+":
			return { v: +v };
		case "~":
			return { v: ~v };
		case "void":
			return { v: undefined };
		default:
			return null;
	}
}
