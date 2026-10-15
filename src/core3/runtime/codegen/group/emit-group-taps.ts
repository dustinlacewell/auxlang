/**
 * The tap sums of a grouped driver, run after every group: per sample, each
 * channel adds its tap slots' block values from 0 in program order, the
 * interpreter's exact sum, into the block's Float32 output.
 * Signature: `(outL, outR, offset, n)`.
 */

import type { BlockSlots } from "./block-slots";

export function emitGroupTaps(
	name: string,
	tapsL: Int32Array,
	tapsR: Int32Array,
	block: BlockSlots,
	buffer: string,
): string[] {
	const sum = (taps: Int32Array) => {
		let s = "0";
		for (const slot of taps) s = `(${s} + ${buffer}[${(block.base.get(slot) as number) + 1} + k])`;
		return s;
	};
	return [
		`function ${name}(outL, outR, offset, n) {`,
		"for (let k = 0; k < n; k++) {",
		`outL[offset + k] = ${sum(tapsL)};`,
		`outR[offset + k] = ${sum(tapsR)};`,
		"}",
		"}",
	];
}
