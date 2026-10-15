/**
 * The size cap for pasting into one generated function, in estimated bytes
 * of V8 bytecode (node-cost.ts): in a group larger than this (one big
 * feedback component), nodes paste only while the estimate fits.
 *
 * How it was measured (Node 24, src/tests/scratch/codegen-size.ts with
 * --print-bytecode and --trace-opt): V8 hands a function to TurboFan only
 * when its bytecode is at most --max-optimized-bytecode-size (61440). The
 * largest generated driver that reached TurboFan was 56033 bytes; the
 * smallest that did not was 70241. Estimates run up to 10 % below measured
 * for pasted code, so the budget sits 15 % under the limit.
 */
export const PASTE_BUDGET = 52_000;
