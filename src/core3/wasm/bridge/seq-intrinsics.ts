/**
 * The seq bridge tick's access to its lane's event table in memory
 * (program/memory-layout.ts): `__tableCycle()`, `__tableCount()`,
 * `__tableRow(field, row)` and `__tableFill(cycle)`, which calls the host
 * (seq-tables.ts) to refill the table for a new cycle.
 */

import type { AnyNode, Expression } from "acorn";
import { toF64 } from "../compile/coerce";
import type { Intrinsics } from "../compile/emit-context";
import { emitExpr } from "../compile/emit-expression";
import type { FnEmitter } from "../compile/fn-emitter";
import { staticOf } from "../compile/static-value";
import { OP } from "../encode/opcodes";
import { TABLE_FIELDS, tableRow } from "../program/memory-layout";

export function seqIntrinsics(table: number, node: number, lane: number, fill: number): Intrinsics {
	return {
		call(e, name, args, at) {
			switch (name) {
				case "__tableCycle":
					e.code.i32Const(0).loadF64(table);
					return "f64";
				case "__tableCount":
					e.code.i32Const(0).loadF64(table + 8);
					return "f64";
				case "__tableRow":
					return readRow(e, table, args, at);
				case "__tableFill":
					e.code.i32Const(node).i32Const(lane);
					toF64(e, emitExpr(e, args[0] as Expression));
					e.code.call(fill);
					return "void";
				default:
					return null;
			}
		},
	};
}

/** Rows are integers in range: a saturating truncation, no check. */
function readRow(e: FnEmitter, table: number, args: readonly Expression[], at: AnyNode): "f64" {
	const field = staticOf(e, args[0] as Expression);
	const index = TABLE_FIELDS.indexOf(field?.v as (typeof TABLE_FIELDS)[number]);
	if (index < 0) return e.fail(at, "__tableRow needs a table field name");
	toF64(e, emitExpr(e, args[1] as Expression));
	e.code.truncSatF64S().i32Const(3).op(OP.i32Shl);
	e.code.loadF64(tableRow(table, index, 0));
	return "f64";
}
