/**
 * Ranges through the exact `Math` functions: min and max of integers,
 * abs, the roundings (the identity on an integer), imul and clz32.
 */

import { INT32, type Range, safeRange } from "./int-range";

export function mathRange(name: string, args: readonly (Range | null)[]): Range | null {
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
