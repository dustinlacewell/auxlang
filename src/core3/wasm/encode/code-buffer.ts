/**
 * The bytes of one function body under construction, with one method per
 * instruction shape the backend uses. Memory is addressed absolutely: a
 * fixed address is `i32.const 0` plus the address as the memarg offset, so
 * the layout's addresses go straight into the code.
 */

import { signedLeb, unsignedLeb } from "./leb128";
import { OP, TRUNC_SAT_F64_S, TRUNC_SAT_F64_U, VOID_BLOCK } from "./opcodes";

const F64_BYTES = new DataView(new ArrayBuffer(8));

export class CodeBuffer {
	bytes: number[] = [];

	op(...ops: number[]): this {
		for (const o of ops) this.bytes.push(o);
		return this;
	}

	u32(n: number): this {
		unsignedLeb(n, this.bytes);
		return this;
	}

	i32Const(n: number): this {
		this.bytes.push(OP.i32Const);
		signedLeb(n, this.bytes);
		return this;
	}

	f64Const(x: number): this {
		this.bytes.push(OP.f64Const);
		F64_BYTES.setFloat64(0, x, true);
		for (let k = 0; k < 8; k++) this.bytes.push(F64_BYTES.getUint8(k));
		return this;
	}

	get(local: number): this {
		return this.op(OP.localGet).u32(local);
	}

	set(local: number): this {
		return this.op(OP.localSet).u32(local);
	}

	tee(local: number): this {
		return this.op(OP.localTee).u32(local);
	}

	call(fn: number): this {
		return this.op(OP.call).u32(fn);
	}

	/** Open a block, loop or if with no result (`result` null) or one value. */
	open(kind: number, result: number | null): this {
		return this.op(kind, result ?? VOID_BLOCK);
	}

	/** f64 at `offset` from the address on the stack. */
	loadF64(offset: number): this {
		return this.op(OP.f64Load).u32(3).u32(offset);
	}

	storeF64(offset: number): this {
		return this.op(OP.f64Store).u32(3).u32(offset);
	}

	loadF32(offset: number): this {
		return this.op(OP.f32Load).u32(2).u32(offset);
	}

	storeF32(offset: number): this {
		return this.op(OP.f32Store).u32(2).u32(offset);
	}

	/** Any load or store: `align` is log2 of the access width in bytes. */
	memory(op: number, align: number, offset: number): this {
		return this.op(op).u32(align).u32(offset);
	}

	truncSatF64S(): this {
		return this.op(OP.prefixFC).u32(TRUNC_SAT_F64_S);
	}

	truncSatF64U(): this {
		return this.op(OP.prefixFC).u32(TRUNC_SAT_F64_U);
	}

	append(bytes: readonly number[]): this {
		for (const b of bytes) this.bytes.push(b);
		return this;
	}
}
