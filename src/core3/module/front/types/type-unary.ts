/**
 * Unary operators. `typeof` always folds where a backend accepts it: a
 * known value, a value a path names (its type is known), or a typed-array
 * element at a valid constant index. `!` tests its argument; `void`
 * evaluates its argument for effects. `+`, `-` and `~` keep an integer
 * range (int-range.ts).
 */

import type { UnaryExpression } from "acorn";
import { applyUnary } from "./fold-ops";
import { INT32, type Range, fitsI32, includes, rangeOf, safeRange } from "./int-range";
import type { PlanContext } from "./plan-context";
import { BOOL, NUM, type Ty, UNKNOWN, int, known } from "./ty";
import { typeExpr } from "./type-expression";

export function typeUnary(c: PlanContext, node: UnaryExpression): Ty {
	switch (node.operator) {
		case "typeof":
			return typeOfType(c, node);
		case "!":
			return folded(node.operator, typeExpr(c, node.argument, "loose"), BOOL);
		case "void":
			return folded(node.operator, typeExpr(c, node.argument, "loose"), NUM);
		case "delete":
			return UNKNOWN;
		default: {
			const arg = typeExpr(c, node.argument, "value");
			return folded(node.operator, arg, int(unaryRange(node.operator, rangeOf(arg))));
		}
	}
}

function unaryRange(op: string, r: Range | null): Range | null {
	switch (op) {
		case "+":
			return r;
		case "-":
			// -0 is not an integer here.
			return r === null || includes(r, 0) ? null : safeRange(-r.hi, -r.lo);
		case "~":
			return fitsI32(r) ? { lo: ~r.hi, hi: ~r.lo } : INT32;
		default:
			return null;
	}
}

function folded(op: string, arg: Ty, otherwise: Ty): Ty {
	if (arg.k !== "static") return otherwise;
	const v = applyUnary(op, arg.v);
	return v === null ? otherwise : known(v.v);
}

function typeOfType(c: PlanContext, node: UnaryExpression): Ty {
	const arg = node.argument;
	const ty = typeExpr(c, arg, "loose");
	if (ty.k === "static") return known(typeof ty.v);
	if (c.elements.has(arg)) return known("number");
	if (!c.paths.has(arg)) return UNKNOWN;
	if (ty.k === "num") return known("number");
	if (ty.k === "bool") return known("boolean");
	return ty.k === "ref" ? known("object") : UNKNOWN;
}
