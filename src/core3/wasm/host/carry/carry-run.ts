/**
 * The carry plan's format: a flat Int32Array of runs, each
 * `(from, to, count, type)`. `from` and `to` index the old and new memory in
 * the run's unit, `count` units are copied: `CARRY_F64` counts f64s on the
 * f64 views, `CARRY_WORD` 32-bit words on the i32 views (wasm-memory.ts).
 *
 * A rebound field's value (layout/state-shape.ts `Field`) is wherever its old
 * pointer slot points at the swap, so its runs read from a base found then:
 *
 * - `CARRY_DEREF` `(slot, 0, 0)`: push the base, then the base becomes the
 *   word address the old slot at word `base + slot` holds;
 * - `CARRY_POP`: back to the pushed base;
 * - `CARRY_REL` `(from, to, count)`: copy `count` words from old word
 *   `base + from` to new word `to`.
 *
 * The base starts at 0, so a run at the top level is absolute. The new side
 * is always the fresh lane's own storage.
 */

export const CARRY_F64 = 0;
export const CARRY_WORD = 1;
export const CARRY_DEREF = 2;
export const CARRY_POP = 3;
export const CARRY_REL = 4;

/** The runs that copy units between fixed addresses. */
export type CarryType = typeof CARRY_F64 | typeof CARRY_WORD | typeof CARRY_REL;

/** Int32 slots per run. */
export const RUN_WIDTH = 4;
