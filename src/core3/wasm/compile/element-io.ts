/**
 * One typed-array element to and from a JS number. A load promotes to f64.
 * A store converts as the JS array's [[Set]] does: Float32 rounds to nearest
 * (f32.demote_f64, ties to even, as Math.fround), the integer types take
 * ToInt32 and keep the low bits (ToInt16, ToUint8 and the rest are those
 * bits), and Uint8Clamped clamps to [0, 255] and rounds ties to even, NaN
 * to 0.
 */

import { OP } from "../encode/opcodes";
import type { ElementType } from "../layout/element-type";
import { toInt32 } from "./coerce";
import type { FnEmitter } from "./fn-emitter";

/** The element at the address on the stack plus `offset`, as an f64. */
export function emitLoad(e: FnEmitter, type: ElementType, offset: number): void {
	const c = e.code;
	switch (type) {
		case "f64":
			c.loadF64(offset);
			return;
		case "f32":
			c.loadF32(offset).op(OP.f64PromoteF32);
			return;
		case "i32":
			c.memory(OP.i32Load, 2, offset).op(OP.f64ConvertI32S);
			return;
		case "u32":
			c.memory(OP.i32Load, 2, offset).op(OP.f64ConvertI32U);
			return;
		case "i16":
			c.memory(OP.i32Load16S, 1, offset).op(OP.f64ConvertI32S);
			return;
		case "u16":
			c.memory(OP.i32Load16U, 1, offset).op(OP.f64ConvertI32S);
			return;
		case "i8":
			c.memory(OP.i32Load8S, 0, offset).op(OP.f64ConvertI32S);
			return;
		case "u8":
		case "u8c":
			c.memory(OP.i32Load8U, 0, offset).op(OP.f64ConvertI32S);
			return;
	}
}

/** Store the f64 on top of the stack (its address under it) at `offset`. */
export function emitStore(e: FnEmitter, type: ElementType, offset: number): void {
	const c = e.code;
	switch (type) {
		case "f64":
			c.storeF64(offset);
			return;
		case "f32":
			c.op(OP.f32DemoteF64).storeF32(offset);
			return;
		case "i32":
		case "u32":
			toInt32(e, "f64");
			c.memory(OP.i32Store, 2, offset);
			return;
		case "i16":
		case "u16":
			toInt32(e, "f64");
			c.memory(OP.i32Store16, 1, offset);
			return;
		case "i8":
		case "u8":
			toInt32(e, "f64");
			c.memory(OP.i32Store8, 0, offset);
			return;
		case "u8c":
			// min and max carry NaN through; the saturating truncation makes it 0.
			c.f64Const(255).op(OP.f64Min).f64Const(0).op(OP.f64Max, OP.f64Nearest);
			c.truncSatF64U().memory(OP.i32Store8, 0, offset);
			return;
	}
}
