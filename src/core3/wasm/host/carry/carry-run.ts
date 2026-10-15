/**
 * The carry plan's format: a flat Int32Array of runs, each
 * `(from, to, count, type)`. `from` and `to` index the old and new memory in
 * the run's unit, `count` units are copied: `CARRY_F64` counts f64s on the
 * f64 views, `CARRY_WORD` 32-bit words on the i32 views (wasm-memory.ts).
 */

export const CARRY_F64 = 0;
export const CARRY_WORD = 1;

export type CarryType = typeof CARRY_F64 | typeof CARRY_WORD;

/** Int32 slots per run. */
export const RUN_WIDTH = 4;
