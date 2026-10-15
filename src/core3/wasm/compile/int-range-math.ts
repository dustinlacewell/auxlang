/**
 * Ranges through the exact `Math` functions: min and max of integers,
 * abs, the roundings (the identity on an integer), imul and clz32.
 */

import type { AnyNode, CallExpression } from "acorn";
import type { FnEmitter } from "./fn-emitter";
import { INT32, type Range, safeRange } from "./int-range";
import { intRange } from "./int-range-of";

export function mathRange(e: FnEmitter, node: CallExpression): Range | null {
	const name = mathName(e, node);
	if (name === null) return null;
	const args = node.arguments.map((a) => (a.type === "SpreadElement" ? null : intRange(e, a)));
	const [x] = args;
	switch (name) {
		case "min":
		case "max":
			return extremeRange(name, args);
		case "abs":
			return x === undefined || x === null ? null : absRange(x);
		case "floor":
		case "ceil":
		case "trunc":
		case "round":
			return x ?? null;
		case "imul":
			return INT32;
		case "clz32":
			return { lo: 0, hi: 32 };
		default:
			return null;
	}
}

/** `Math.<name>` with `Math` the global. */
export function mathName(e: FnEmitter, node: CallExpression): string | null {
	const callee: AnyNode = node.callee;
	if (
		callee.type !== "MemberExpression" ||
		callee.computed ||
		callee.object.type !== "Identifier" ||
		callee.object.name !== "Math" ||
		e.scope.lookup("Math") !== undefined ||
		callee.property.type !== "Identifier"
	)
		return null;
	return callee.property.name;
}

function extremeRange(name: string, args: readonly (Range | null)[]): Range | null {
	if (args.length === 0) return null;
	let out: Range | null = null;
	for (const r of args) {
		if (r === null) return null;
		out =
			out === null
				? r
				: name === "min"
					? { lo: Math.min(out.lo, r.lo), hi: Math.min(out.hi, r.hi) }
					: { lo: Math.max(out.lo, r.lo), hi: Math.max(out.hi, r.hi) };
	}
	return out;
}

function absRange(x: Range): Range | null {
	const lo = x.lo >= 0 ? x.lo : x.hi <= 0 ? -x.hi : 0;
	return safeRange(lo, Math.max(Math.abs(x.lo), Math.abs(x.hi)));
}
