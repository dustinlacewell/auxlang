/**
 * `Math` calls on integer arguments, as integers of the width their ranges
 * need: min and max (no NaN, no -0 to order), abs, and floor, ceil, trunc
 * and round, which leave an integer as it is.
 */

import type { AnyNode, CallExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { emitInteger, integerWidth } from "./emit-int";
import type { FnEmitter } from "./fn-emitter";
import { wider } from "./int-range";
import type { Kind, Width } from "./values";

const ROUNDINGS: ReadonlySet<string> = new Set(["floor", "ceil", "trunc", "round"]);

/** Emits `Math.<name>(...)` as an integer and returns its kind, or emits nothing and returns null. */
export function emitIntMath(e: FnEmitter, name: string, node: CallExpression): Kind | null {
	const args: readonly AnyNode[] = node.arguments;
	const result = integerWidth(e, node);
	if (result === null || args.length === 0) return null;
	const widths = args.map((a) => (a.type === "SpreadElement" ? null : integerWidth(e, a)));
	if (widths.some((w) => w === null)) return null;
	const width = (widths as Width[]).reduce(wider, result);
	if (name === "min" || name === "max") emitExtreme(e, name, args, width);
	else if (args.length !== 1) return null;
	else if (name === "abs") emitAbs(e, args[0] as AnyNode, width);
	else if (ROUNDINGS.has(name)) emitInteger(e, args[0] as AnyNode, width);
	else return null;
	return width;
}

/** a < b ? a : b (min) or a > b ? a : b (max), folded left over the arguments. */
function emitExtreme(e: FnEmitter, name: string, args: readonly AnyNode[], width: Width): void {
	emitInteger(e, args[0] as AnyNode, width);
	if (args.length === 1) return;
	const a = e.local(width);
	const b = e.local(width);
	const compare =
		width === "int"
			? name === "min"
				? OP.i32LtS
				: OP.i32GtS
			: name === "min"
				? OP.i64LtS
				: OP.i64GtS;
	for (const arg of args.slice(1)) {
		e.code.set(a);
		emitInteger(e, arg, width);
		e.code.set(b);
		e.code.get(a).get(b).get(a).get(b).op(compare).op(OP.select);
	}
}

/** x < 0 ? 0 - x : x */
function emitAbs(e: FnEmitter, arg: AnyNode, width: Width): void {
	const x = e.local(width);
	emitInteger(e, arg, width);
	e.code.set(x);
	if (width === "int") {
		e.code.i32Const(0).get(x).op(OP.i32Sub);
		e.code.get(x).get(x).i32Const(0).op(OP.i32LtS).op(OP.select);
	} else {
		e.code.i64Const(0).get(x).op(OP.i64Sub);
		e.code.get(x).get(x).i64Const(0).op(OP.i64LtS).op(OP.select);
	}
}
