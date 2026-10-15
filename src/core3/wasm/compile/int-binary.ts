/**
 * Binary operators on integer operands (int-range-of.ts). A comparison of
 * two integers compares as i32, or as i64 when either may leave int32;
 * `+`, `-`, `*` and `%` run in the narrowest width that holds both operands
 * and the result (int-range-binary.ts: no overflow, no -0, no division by
 * zero), so the integer result is the JS one. Bitwise operators always run
 * in i32: a constant operand is its ToInt32, an integer one its low 32
 * bits, anything else goes through ToInt32; `>>>` gives an i64 when its
 * result may leave int32.
 */

import type { AnyNode, BinaryExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { toInt32 } from "./coerce";
import { emitExpr } from "./emit-expression";
import { emitInteger, integerWidth } from "./emit-int";
import type { FnEmitter } from "./fn-emitter";
import { wider } from "./int-range";
import { staticOf } from "./static-value";
import type { Kind, Width } from "./values";

type Ops = Readonly<Record<string, Readonly<Record<Width, number>>>>;

const COMPARE: Ops = {
	"<": { int: OP.i32LtS, long: OP.i64LtS },
	">": { int: OP.i32GtS, long: OP.i64GtS },
	"<=": { int: OP.i32LeS, long: OP.i64LeS },
	">=": { int: OP.i32GeS, long: OP.i64GeS },
	"===": { int: OP.i32Eq, long: OP.i64Eq },
	"==": { int: OP.i32Eq, long: OP.i64Eq },
	"!==": { int: OP.i32Ne, long: OP.i64Ne },
	"!=": { int: OP.i32Ne, long: OP.i64Ne },
};

const ARITHMETIC: Ops = {
	"+": { int: OP.i32Add, long: OP.i64Add },
	"-": { int: OP.i32Sub, long: OP.i64Sub },
	"*": { int: OP.i32Mul, long: OP.i64Mul },
	"%": { int: OP.i32RemS, long: OP.i64RemS },
};

const BITWISE: Readonly<Record<string, number>> = {
	"&": OP.i32And,
	"|": OP.i32Or,
	"^": OP.i32Xor,
	"<<": OP.i32Shl,
	">>": OP.i32ShrS,
	">>>": OP.i32ShrU,
};

/** Emits `node` in its integer form and returns its kind; null (nothing emitted) when it has none. */
export function emitIntBinary(e: FnEmitter, node: BinaryExpression): Kind | null {
	const op = node.operator;
	const bitwise = BITWISE[op];
	if (bitwise !== undefined) return emitBitwise(e, node, bitwise);
	const ops = COMPARE[op] ?? ARITHMETIC[op];
	if (ops === undefined) return null;
	const left = integerWidth(e, node.left);
	const right = integerWidth(e, node.right);
	if (left === null || right === null) return null;
	const result = op in ARITHMETIC ? integerWidth(e, node) : "int";
	if (result === null) return null;
	const width = wider(wider(left, right), result);
	emitInteger(e, node.left, width);
	emitInteger(e, node.right, width);
	e.code.op(ops[width]);
	if (op in COMPARE) return "bool";
	if (width === result) return width;
	e.code.op(OP.i32WrapI64);
	return "int";
}

function emitBitwise(e: FnEmitter, node: BinaryExpression, op: number): Kind {
	intOperand(e, node.left);
	intOperand(e, node.right);
	e.code.op(op);
	if (node.operator !== ">>>" || integerWidth(e, node) === "int") return "int";
	e.code.op(OP.i64ExtendI32U);
	return "long";
}

/** ToInt32 of an operand, as an i32. */
function intOperand(e: FnEmitter, node: AnyNode): void {
	const known = staticOf(e, node);
	if (typeof known?.v === "number") {
		e.code.i32Const(known.v | 0);
		return;
	}
	const width = integerWidth(e, node);
	if (width === null) toInt32(e, emitExpr(e, node));
	else {
		emitInteger(e, node, width);
		if (width === "long") e.code.op(OP.i32WrapI64);
	}
}
