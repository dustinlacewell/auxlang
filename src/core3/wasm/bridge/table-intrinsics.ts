/**
 * The table intrinsics (module/front/intrinsics/table-intrinsics.ts) bound to a
 * lane's table slot in memory (layout/table-format.ts): `__tableCycle()`,
 * `__tableCount()` and `__tableRow(field, row)` are loads through the slot's
 * `cur` pointer; `__tableFill(cycle)` calls the module's `enter`
 * (program/table-enter.ts), which swaps to the table filled ahead or calls
 * the host's `env.fill` (host/seq-tables.ts).
 */

import type { AnyNode, Expression } from "acorn";
import { isTableRowField } from "../../module/front/intrinsics/table-intrinsics";
import { toF64 } from "../compile/coerce";
import type { Intrinsics } from "../compile/emit-context";
import { emitExpr } from "../compile/emit-expression";
import type { FnEmitter } from "../compile/fn-emitter";
import { staticOf } from "../compile/static-value";
import { OP } from "../encode/opcodes";
import {
	ROW_BYTES,
	SLOT_CUR,
	TABLE_COUNT,
	TABLE_CYCLE,
	TABLE_HEADER,
	fieldOffset,
} from "../layout/table-format";

export function tableIntrinsics(
	slot: number,
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
					return readRow(e, slot, args, at);
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
function readRow(e: FnEmitter, slot: number, args: readonly Expression[], at: AnyNode): "f64" {
	const field = staticOf(e, args[0] as Expression)?.v;
	if (!isTableRowField(field)) return e.fail(at, "__tableRow needs a table field name");
	current(e, slot);
	toF64(e, emitExpr(e, args[1] as Expression));
	e.code.truncSatF64S().i32Const(ROW_BYTES).op(OP.i32Mul, OP.i32Add);
	e.code.loadF64(TABLE_HEADER + fieldOffset(field));
	return "f64";
}
