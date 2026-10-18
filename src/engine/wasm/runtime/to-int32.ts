/**
 * JS ToInt32: truncate, wrap modulo 2^32, 0 for NaN and the infinities.
 * Below 2^31 in magnitude it is one truncation; above, the wrap is
 * t - floor(t * 2^-32) * 2^32, which is exact for an integer t (the scaling
 * is by a power of two and the difference is an integer below 2^32).
 */

import { CodeBuffer } from "../encode/code-buffer";
import { F64, I32, OP } from "../encode/opcodes";
import type { RawFunction } from "./raw-function";

export function toInt32Function(): RawFunction {
	const x = 0;
	const t = 1;
	const c = new CodeBuffer();
	c.get(x).op(OP.f64Abs).f64Const(2147483648).op(OP.f64Lt);
	c.open(OP.if, I32);
	c.get(x).op(OP.i32TruncF64S);
	c.op(OP.else);
	// finite: x - x === 0
	c.get(x).get(x).op(OP.f64Sub).f64Const(0).op(OP.f64Eq);
	c.open(OP.if, I32);
	c.get(x).op(OP.f64Trunc).tee(t);
	c.get(t)
		.f64Const(2 ** -32)
		.op(OP.f64Mul, OP.f64Floor)
		.f64Const(2 ** 32)
		.op(OP.f64Mul);
	c.op(OP.f64Sub, OP.i32TruncF64U);
	c.op(OP.else).i32Const(0).op(OP.end);
	c.op(OP.end);
	return { params: [F64], result: I32, locals: [F64], body: c.bytes };
}
