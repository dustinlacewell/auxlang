/**
 * One typed-array element to and from a JS number. A load gives an f64, or
 * for an integer element type an integer when the caller can take one. A
 * store converts as the JS array's [[Set]] does: Float32 rounds to nearest
 * (f32.demote_f64, ties to even, as Math.fround), the integer types take
 * ToInt32 and keep the low bits (ToInt16, ToUint8 and the rest are those
 * bits; an integer's ToInt32 is its low 32 bits), and Uint8Clamped clamps to
 * [0, 255] and rounds ties to even, NaN to 0.
 */

import { OP } from "../encode/opcodes";
import type { ElementType } from "../layout/element-type";
import { toF64, toInt32 } from "./coerce";
import type { FnEmitter } from "./fn-emitter";
import type { Kind } from "./values";

/** The kinds a number can have. */
export type NumberKind = Exclude<Kind, "bool">;

/** Integer loads: opcode, alignment, and whether the value is unsigned. */
const INT_LOADS: Readonly<Partial<Record<ElementType, readonly [number, number, boolean]>>> = {
	i32: [OP.i32Load, 2, false],
	u32: [OP.i32Load, 2, true],
	i16: [OP.i32Load16S, 1, false],
	u16: [OP.i32Load16U, 1, false],
	i8: [OP.i32Load8S, 0, false],
	u8: [OP.i32Load8U, 0, false],
	u8c: [OP.i32Load8U, 0, false],
};

const INT_STORES: Readonly<Partial<Record<ElementType, readonly [number, number]>>> = {
	i32: [OP.i32Store, 2],
	u32: [OP.i32Store, 2],
	i16: [OP.i32Store16, 1],
	u16: [OP.i32Store16, 1],
	i8: [OP.i32Store8, 0],
	u8: [OP.i32Store8, 0],
};

/**
 * The element at the address on the stack plus `offset`: with `asInt`, an
 * integer element as an i32 (a u32 one as an i64); otherwise an f64.
 */
export function emitLoad(
	e: FnEmitter,
	type: ElementType,
	offset: number,
	asInt: boolean,
): NumberKind {
	const c = e.code;
	if (type === "f64") {
		c.loadF64(offset);
		return "f64";
	}
	if (type === "f32") {
		c.loadF32(offset).op(OP.f64PromoteF32);
		return "f64";
	}
	const [op, align, unsigned] = INT_LOADS[type] as readonly [number, number, boolean];
	c.memory(op, align, offset);
	if (asInt && !unsigned) return "int";
	if (asInt) {
		c.op(OP.i64ExtendI32U);
		return "long";
	}
	c.op(unsigned ? OP.f64ConvertI32U : OP.f64ConvertI32S);
	return "f64";
}

/** Store the value on top of the stack, of kind `kind` (its address under it), at `offset`. */
export function emitStore(e: FnEmitter, type: ElementType, offset: number, kind: NumberKind): void {
	const c = e.code;
	const int = INT_STORES[type];
	if (int !== undefined) {
		toInt32(e, kind);
		c.memory(int[0], int[1], offset);
		return;
	}
	toF64(e, kind);
	switch (type) {
		case "f64":
			c.storeF64(offset);
			return;
		case "f32":
			c.op(OP.f32DemoteF64).storeF32(offset);
			return;
		default:
			// u8c: min and max carry NaN through; the saturating truncation makes it 0.
			c.f64Const(255).op(OP.f64Min).f64Const(0).op(OP.f64Max, OP.f64Nearest);
			c.truncSatF64U().memory(OP.i32Store8, 0, offset);
	}
}
