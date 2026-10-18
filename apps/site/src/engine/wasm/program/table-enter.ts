/**
 * `enter(slot, node, lane, cycle)`: what `__tableFill(cycle)` does in WASM
 * (layout/table-format.ts). When the lane's `next` table holds `cycle`, the
 * two pointers swap; else the host's `env.fill` fills `cur` (the miss path).
 * Then the slot wants `cycle + 1`, which the host fills into `next` after
 * the render (host/seq-tables.ts `fillAhead`). A NaN cycle never matches,
 * so it misses as the JS table does, and wants nothing.
 */

import { CodeBuffer } from "../encode/code-buffer";
import type { DefinedFunc } from "../encode/module-bytes";
import { F64, I32, OP } from "../encode/opcodes";
import { SLOT_CUR, SLOT_NEXT, SLOT_WANT, TABLE_CYCLE } from "../layout/table-format";

const SLOT = 0;
const NODE = 1;
const LANE = 2;
const CYCLE = 3;
const NEXT = 4;

/** The parameter types: slot address, node, lane, cycle. */
export const ENTER_PARAMS = [I32, I32, I32, F64] as const;

export function tableEnter(type: number, fill: number): DefinedFunc {
	const c = new CodeBuffer();
	c.get(SLOT).memory(OP.i32Load, 2, SLOT_NEXT).tee(NEXT);
	c.loadF64(TABLE_CYCLE).get(CYCLE).op(OP.f64Eq);
	c.open(OP.if, null);
	swap(c);
	c.op(OP.else);
	c.get(NODE).get(LANE).get(CYCLE).call(fill);
	c.op(OP.end);
	c.get(SLOT).get(CYCLE).f64Const(1).op(OP.f64Add).storeF64(SLOT_WANT);
	return { type, locals: [I32], body: c.bytes };
}

/** next ← cur, cur ← the old next. */
function swap(c: CodeBuffer): void {
	c.get(SLOT).get(SLOT).memory(OP.i32Load, 2, SLOT_CUR).memory(OP.i32Store, 2, SLOT_NEXT);
	c.get(SLOT).get(NEXT).memory(OP.i32Store, 2, SLOT_CUR);
}
