/**
 * Write one built state value into fresh memory at its shape's address.
 * Fresh memory is zero, so a number that is zero is skipped. Typed arrays
 * are copied whole as raw bytes, which keeps every bit (NaN payloads, -0):
 * a copy beats a scan for non-zero words, and the worklet maps every page
 * ahead anyway (touch-pages.ts).
 */

import type { Field, Shape } from "../layout/state-shape";
import { pointElementsHome, pointHome } from "./codec/field-address";

/** A field of the record at `base`: its value in its own storage, a rebound field's slot pointing there. */
export function initField(memory: ArrayBuffer, base: number, field: Field, value: unknown): void {
	pointHome(memory, base, field);
	writeState(memory, base + field.offset, field.shape, value);
}

function writeState(memory: ArrayBuffer, at: number, shape: Shape, value: unknown): void {
	switch (shape.k) {
		case "number": {
			const x = Number(value);
			if (!Object.is(x, 0)) new Float64Array(memory, at, 1)[0] = x;
			return;
		}
		case "array":
			copyBytes(memory, at, value as ArrayBufferView);
			return;
		case "record": {
			const record = value as Record<string, unknown>;
			for (const [name, field] of Object.entries(shape.fields))
				initField(memory, at, field, record[name]);
			return;
		}
		case "records": {
			const list = value as readonly unknown[];
			pointElementsHome(memory, at, shape);
			list.forEach((item, k) => {
				writeState(memory, at + k * shape.element.size, shape.element, item);
			});
		}
	}
}

/** `at` is 8-aligned (layout/state-shape.ts); a word copy needs the source 4-aligned too. */
function copyBytes(memory: ArrayBuffer, at: number, src: ArrayBufferView): void {
	const n = src.byteLength;
	const words = src.byteOffset % 4 === 0 && n % 4 === 0;
	const Unit = words ? Int32Array : Uint8Array;
	const size = words ? 4 : 1;
	const from = new Unit(src.buffer as ArrayBuffer, src.byteOffset, n / size);
	new Unit(memory, at, n / size).set(from);
}
