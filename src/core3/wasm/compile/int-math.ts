/**
 * `Math` calls on int32-ranged arguments, in i32: min and max of integers
 * (no NaN, no -0 to order), abs when its result fits int32, and floor,
 * ceil, trunc and round, which leave an integer as it is.
 */

import type { AnyNode, CallExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { emitInt, isInt } from "./emit-int";
import type { FnEmitter } from "./fn-emitter";

const ROUNDINGS: ReadonlySet<string> = new Set(["floor", "ceil", "trunc", "round"]);

/** Emits `Math.<name>(...)` as an i32 and returns true, or emits nothing and returns false. */
export function emitIntMath(e: FnEmitter, name: string, node: CallExpression): boolean {
	const args: readonly AnyNode[] = node.arguments;
	if (args.length === 0 || !args.every((a) => a.type !== "SpreadElement" && isInt(e, a)))
		return false;
	const extreme = name === "min" || name === "max";
	if (!extreme && args.length !== 1) return false;
	if (extreme) emitExtreme(e, name, args);
	else if (name === "abs" && isInt(e, node)) emitAbs(e, args[0] as AnyNode);
	else if (ROUNDINGS.has(name)) emitInt(e, args[0] as AnyNode);
	else return false;
	return true;
}

/** a < b ? a : b (min) or a > b ? a : b (max), folded left over the arguments. */
function emitExtreme(e: FnEmitter, name: string, args: readonly AnyNode[]): void {
	const a = e.local("int");
	const b = e.local("int");
	emitInt(e, args[0] as AnyNode);
	for (const arg of args.slice(1)) {
		e.code.set(a);
		emitInt(e, arg);
		e.code.set(b);
		e.code
			.get(a)
			.get(b)
			.get(a)
			.get(b)
			.op(name === "min" ? OP.i32LtS : OP.i32GtS)
			.op(OP.select);
	}
}

/** x < 0 ? 0 - x : x */
function emitAbs(e: FnEmitter, arg: AnyNode): void {
	const x = e.local("int");
	emitInt(e, arg);
	e.code.set(x);
	e.code.i32Const(0).get(x).op(OP.i32Sub);
	e.code.get(x).get(x).i32Const(0).op(OP.i32LtS).op(OP.select);
}
