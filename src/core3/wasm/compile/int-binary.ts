/**
 * Binary operators on i32 operands. A comparison of two int32-ranged
 * operands compares as i32; `+`, `-`, `*` and `%` run in i32 when their
 * operands and their result fit int32 (int-range-binary.ts: no overflow,
 * no -0, no division by zero), so the i32 result is the JS one. Bitwise
 * operators always run in i32: a constant operand is its ToInt32, an int32
 * one goes as it is, anything else through ToInt32; `>>>` stays an i32 when
 * its result fits int32.
 */

import type { AnyNode, BinaryExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { toInt32 } from "./coerce";
import { emitExpr } from "./emit-expression";
import { emitInt, isInt } from "./emit-int";
import type { FnEmitter } from "./fn-emitter";
import { staticOf } from "./static-value";
import type { Kind } from "./values";

const COMPARE: Readonly<Record<string, number>> = {
	"<": OP.i32LtS,
	">": OP.i32GtS,
	"<=": OP.i32LeS,
	">=": OP.i32GeS,
	"===": OP.i32Eq,
	"==": OP.i32Eq,
	"!==": OP.i32Ne,
	"!=": OP.i32Ne,
};

const ARITHMETIC: Readonly<Record<string, number>> = {
	"+": OP.i32Add,
	"-": OP.i32Sub,
	"*": OP.i32Mul,
	"%": OP.i32RemS,
};

const BITWISE: Readonly<Record<string, number>> = {
	"&": OP.i32And,
	"|": OP.i32Or,
	"^": OP.i32Xor,
	"<<": OP.i32Shl,
	">>": OP.i32ShrS,
	">>>": OP.i32ShrU,
};

/** Emits `node` in its i32 form and returns its kind; null (nothing emitted) when it has none. */
export function emitIntBinary(e: FnEmitter, node: BinaryExpression): Kind | null {
	const op = node.operator;
	const bitwise = BITWISE[op];
	if (bitwise !== undefined) return emitBitwise(e, node, bitwise);
	const compare = COMPARE[op];
	const arithmetic = ARITHMETIC[op];
	if (compare === undefined && arithmetic === undefined) return null;
	if (!isInt(e, node.left) || !isInt(e, node.right)) return null;
	if (arithmetic !== undefined && !isInt(e, node)) return null;
	emitInt(e, node.left);
	emitInt(e, node.right);
	e.code.op((compare ?? arithmetic) as number);
	return compare !== undefined ? "bool" : "int";
}

function emitBitwise(e: FnEmitter, node: BinaryExpression, op: number): Kind {
	intOperand(e, node.left);
	intOperand(e, node.right);
	e.code.op(op);
	if (node.operator !== ">>>" || isInt(e, node)) return "int";
	e.code.op(OP.f64ConvertI32U);
	return "f64";
}

/** ToInt32 of an operand, as an i32. */
function intOperand(e: FnEmitter, node: AnyNode): void {
	const known = staticOf(e, node);
	if (typeof known?.v === "number") e.code.i32Const(known.v | 0);
	else if (isInt(e, node)) emitInt(e, node);
	else toInt32(e, emitExpr(e, node));
}
