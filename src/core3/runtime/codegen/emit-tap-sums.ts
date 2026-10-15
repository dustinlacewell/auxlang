/**
 * The out-node tap sums for sample `k`: each channel adds its tap slots'
 * locals from 0 in program order, the interpreter's exact sum
 * (`0 + -0` is `0`), then lands in the block's Float32 output.
 */

import { slotLocal } from "./name-table";

export function emitTapSums(tapsL: Int32Array, tapsR: Int32Array): string[] {
	return [`outL[offset + k] = ${sumOf(tapsL)};`, `outR[offset + k] = ${sumOf(tapsR)};`];
}

function sumOf(taps: Int32Array): string {
	let sum = "0";
	for (const slot of taps) sum = `(${sum} + ${slotLocal(slot)})`;
	return sum;
}
