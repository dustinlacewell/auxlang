/**
 * Binary operators with JS semantics on f64: arithmetic is IEEE (as V8),
 * `%` is the exact remainder (runtime fmod), comparisons are false on NaN,
 * bitwise operators work on ToInt32 of their operands. Integer operands
 * take the i32 forms first (int-binary.ts). Otherwise both operands are
 * emitted first, so the conversions can depend on both kinds.
 */

import type { AnyNode, BinaryExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { toF64, toInt32 } from "./coerce";
import { emitExpr } from "./emit-expression";
import type { FnEmitter } from "./fn-emitter";
import { emitIntBinary } from "./int-binary";
import type { Kind } from "./values";

/** An emitted operand: its bytes and kind, not yet placed. */
export interface Operand {
	readonly bytes: number[];
	readonly value: Kind;
}

const ARITHMETIC: Readonly<Record<string, number>> = {
	"+": OP.f64Add,
	"-": OP.f64Sub,
	"*": OP.f64Mul,
	"/": OP.f64Div,
};

const F64_COMPARE: Readonly<Record<string, number>> = {
	"<": OP.f64Lt,
	">": OP.f64Gt,
	"<=": OP.f64Le,
	">=": OP.f64Ge,
	"===": OP.f64Eq,
	"==": OP.f64Eq,
	"!==": OP.f64Ne,
	"!=": OP.f64Ne,
};

const I32_COMPARE: Readonly<Record<string, number>> = {
	"<": OP.i32LtS,
	">": OP.i32GtS,
	"<=": OP.i32LeS,
	">=": OP.i32GeS,
	"===": OP.i32Eq,
	"==": OP.i32Eq,
	"!==": OP.i32Ne,
	"!=": OP.i32Ne,
};

const EQUALITY: ReadonlySet<string> = new Set(["===", "==", "!==", "!="]);

const STRICT: ReadonlySet<string> = new Set(["===", "!=="]);

const BITWISE: Readonly<Record<string, number>> = {
	"&": OP.i32And,
	"|": OP.i32Or,
	"^": OP.i32Xor,
	"<<": OP.i32Shl,
	">>": OP.i32ShrS,
	">>>": OP.i32ShrU,
};

export function emitBinary(e: FnEmitter, node: BinaryExpression): Kind {
	if (node.left.type === "PrivateIdentifier") return e.fail(node, "private names are not allowed");
	const int = emitIntBinary(e, node);
	if (int !== null) return int;
	const left = e.capture(() => emitExpr(e, node.left));
	const right = e.capture(() => emitExpr(e, node.right));
	return combine(e, node.operator, left, right, node);
}

export function combine(
	e: FnEmitter,
	op: string,
	left: Operand,
	right: Operand,
	at: AnyNode,
): Kind {
	const arithmetic = ARITHMETIC[op];
	if (arithmetic !== undefined) {
		placeF64(e, left);
		placeF64(e, right);
		e.code.op(arithmetic);
		return "f64";
	}
	if (op === "%") {
		placeF64(e, left);
		placeF64(e, right);
		e.code.call(e.ctx.calls.runtime("fmod").index);
		return "f64";
	}
	const compare = F64_COMPARE[op];
	if (compare !== undefined) return emitCompare(e, op, left, right);
	const bitwise = BITWISE[op];
	if (bitwise !== undefined) {
		placeInt(e, left);
		placeInt(e, right);
		e.code.op(bitwise);
		if (op !== ">>>") return "int";
		e.code.op(OP.f64ConvertI32U);
		return "f64";
	}
	return e.fail(at, `the operator ${op} is not supported by the WASM backend`);
}

/**
 * Two ints or two booleans compare as i32; anything else as f64, booleans
 * as 0/1 (ToNumber, as JS's `<` and `==`). Strict equality between a
 * boolean and a number is decided by the types alone, as in JS: `true === 1`
 * is false. Both sides still run, for their effects.
 */
function emitCompare(e: FnEmitter, op: string, left: Operand, right: Operand): Kind {
	if (STRICT.has(op) && (left.value === "bool") !== (right.value === "bool")) {
		e.code.append(left.bytes).op(OP.drop).append(right.bytes).op(OP.drop);
		e.code.i32Const(op === "===" ? 0 : 1);
		return "bool";
	}
	const ints = left.value === "int" && right.value === "int";
	const bools = left.value === "bool" && right.value === "bool" && EQUALITY.has(op);
	if (ints || bools) {
		e.code
			.append(left.bytes)
			.append(right.bytes)
			.op(I32_COMPARE[op] as number);
		return "bool";
	}
	placeF64(e, left);
	placeF64(e, right);
	e.code.op(F64_COMPARE[op] as number);
	return "bool";
}

function placeF64(e: FnEmitter, operand: Operand): void {
	e.code.append(operand.bytes);
	toF64(e, operand.value);
}

function placeInt(e: FnEmitter, operand: Operand): void {
	e.code.append(operand.bytes);
	toInt32(e, operand.value);
}
