/**
 * JS Math.round: the nearest integer, halves toward +Infinity, with the
 * sign of x (so -0.4 gives -0). f = floor(x); f + 1 when x - f >= 0.5. The
 * difference is exact except for x in (-0.5, 0), where it is at least 0.5
 * either way, so the choice is always right.
 */

import { CodeBuffer } from "../encode/code-buffer";
import { F64, OP } from "../encode/opcodes";
import type { RawFunction } from "./raw-function";

export function roundFunction(): RawFunction {
	const x = 0;
	const f = 1;
	const c = new CodeBuffer();
	c.get(x).op(OP.f64Floor).set(f);
	c.get(f).f64Const(1).op(OP.f64Add);
	c.get(f);
	c.get(x).get(f).op(OP.f64Sub).f64Const(0.5).op(OP.f64Ge);
	c.op(OP.select);
	c.get(x).op(OP.f64Copysign);
	return { params: [F64], result: F64, locals: [F64], body: c.bytes };
}
