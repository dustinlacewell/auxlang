/**
 * The table intrinsics (module/front/intrinsics/table-intrinsics.ts) bound to a
 * lane's table slot in memory (layout/table-format.ts): `__tableCycle()`,
 * `__tableCount()`, `__tableRow(field, row)` and `__tableField(k, row)` are
 * loads through the slot's `cur` pointer, rows `rowBytes` apart (the lane's
 * stride, a constant here); `__tableFill(cycle)` calls the module's `enter`
 * (program/table-enter.ts), which swaps to the table filled ahead or calls
 * the host's `env.fill` (host/seq-tables.ts).
 */

import type { AnyNode, Expression } from "acorn";
import { isTableRowField } from "../../dsp/front/intrinsics/table-intrinsics";
import { toF64 } from "../compile/coerce";
import type { Intrinsics } from "../compile/emit-context";
import { emitExpr } from "../compile/emit-expression";
import type { FnEmitter } from "../compile/fn-emitter";
import { OP } from "../encode/opcodes";
import {
	SLOT_CUR,
	TABLE_COUNT,
	TABLE_CYCLE,
	TABLE_HEADER,
	fieldOffset,
	recordFieldOffset,
} from "../layout/table-format";

export function tableIntrinsics(
	slot: number,
	rowBytes: number,
	node: number,
	lane: number,
	enter: number,
): Intrinsics {
	return {
		call(e, name, args, at) {
			switch (name) {
				case "__tableCycle":
					current(e, slot).loadF64(TABLE_CYCLE);
					return "f64";
				case "__tableCount":
					current(e, slot).loadF64(TABLE_COUNT);
					return "f64";
				case "__tableRow":
					return readRow(e, slot, rowBytes, args, at);
				case "__tableField":
					return readField(e, slot, rowBytes, args);
				case "__tableFill":
					e.code.i32Const(slot).i32Const(node).i32Const(lane);
					toF64(e, emitExpr(e, args[0] as Expression));
					e.code.call(enter);
					return "void";
				default:
					return null;
			}
		},
	};
}

/** The `cur` table's address on the stack. */
function current(e: FnEmitter, slot: number) {
	return e.code.i32Const(0).memory(OP.i32Load, 2, slot + SLOT_CUR);
}

/** Rows are integers in range: a saturating truncation, no check. */
function readRow(
	e: FnEmitter,
	slot: number,
	rowBytes: number,
	args: readonly Expression[],
	at: AnyNode,
): "f64" {
	const field = e.fold(args[0] as Expression)?.v;
	if (!isTableRowField(field)) return e.fail(at, "__tableRow needs a table field name");
	current(e, slot);
	addScaled(e, args[1] as Expression, rowBytes);
	e.code.loadF64(TABLE_HEADER + fieldOffset(field));
	return "f64";
}

/** Record field k of a row: k, then the row, as the JS binding indexes them; both in range, no check. */
function readField(e: FnEmitter, slot: number, rowBytes: number, args: readonly Expression[]): "f64" {
	current(e, slot);
	addScaled(e, args[0] as Expression, 8);
	addScaled(e, args[1] as Expression, rowBytes);
	e.code.loadF64(TABLE_HEADER + recordFieldOffset(0));
	return "f64";
}

/** Add `index * bytes` to the address on the stack: a saturating truncation of the index. */
function addScaled(e: FnEmitter, index: Expression, bytes: number): void {
	toF64(e, emitExpr(e, index));
	e.code.truncSatF64S().i32Const(bytes).op(OP.i32Mul, OP.i32Add);
}
