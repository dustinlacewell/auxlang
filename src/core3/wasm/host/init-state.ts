/**
 * Write one built state value into fresh memory at its shape's address. Fresh
 * memory is zero, so only non-zero words are written: a 4 s delay line of
 * silence costs a scan, never a page write. Typed arrays are copied as raw
 * bytes, which keeps every bit (NaN payloads, -0).
 */

import type { Shape } from "../layout/state-shape";

export function writeState(memory: ArrayBuffer, at: number, shape: Shape, value: unknown): void {
	switch (shape.k) {
		case "number": {
			const x = Number(value);
			if (!Object.is(x, 0)) new Float64Array(memory, at, 1)[0] = x;
			return;
		}
		case "array":
			copyNonZero(memory, at, value as ArrayBufferView);
			return;
		case "record": {
			const record = value as Record<string, unknown>;
			for (const [name, field] of Object.entries(shape.fields))
				writeState(memory, at + field.offset, field.shape, record[name]);
			return;
		}
		case "records": {
			const list = value as readonly unknown[];
			list.forEach((item, k) => {
				writeState(memory, at + k * shape.element.size, shape.element, item);
			});
		}
	}
}

/** `at` is 8-aligned (layout/state-shape.ts); a word copy needs the source 4-aligned too. */
function copyNonZero(memory: ArrayBuffer, at: number, src: ArrayBufferView): void {
	const n = src.byteLength;
	const words = src.byteOffset % 4 === 0 && n % 4 === 0;
	const Unit = words ? Int32Array : Uint8Array;
	const size = words ? 4 : 1;
	const from = new Unit(src.buffer as ArrayBuffer, src.byteOffset, n / size);
	const to = new Unit(memory, at, n / size);
	for (let k = 0; k < from.length; k++) {
		const v = from[k] as number;
		if (v !== 0) to[k] = v;
	}
}
