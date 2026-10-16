/**
 * One state value between memory and JS, by its shape (layout/state-shape.ts):
 * a number as an f64, a typed array as its raw bytes (every bit kept), a
 * record field by field, an array of records element by element. Reads copy
 * (a new typed array, a new record) and follow a rebound field's or
 * element's pointer; writes write every byte, zeros included, into the
 * value's own storage and point it back there.
 */

import { ELEMENT_ARRAYS } from "../../layout/element-array";
import { ELEMENT_BYTES } from "../../layout/element-type";
import type { Field, Shape } from "../../layout/state-shape";
import { elementAddress, pointElementsHome, pointHome, valueAddress } from "./field-address";

/** A field of the record at `base`: the value it names now, through its pointer when rebound. */
export function readField(memory: ArrayBuffer, base: number, field: Field): unknown {
	return readShape(memory, valueAddress(memory, base, field), field.shape);
}

/** A field of the record at `base`, written into its own storage, a rebound field pointed back there. */
export function writeField(memory: ArrayBuffer, base: number, field: Field, value: unknown): void {
	pointHome(memory, base, field);
	writeShape(memory, base + field.offset, field.shape, value);
}

function readShape(memory: ArrayBuffer, at: number, shape: Shape): unknown {
	switch (shape.k) {
		case "number":
			return new Float64Array(memory, at, 1)[0];
		case "array": {
			const bytes = shape.length * ELEMENT_BYTES[shape.type];
			return new ELEMENT_ARRAYS[shape.type](memory.slice(at, at + bytes));
		}
		case "record":
			return Object.fromEntries(
				Object.entries(shape.fields).map(([name, f]) => [name, readField(memory, at, f)]),
			);
		case "records":
			return Array.from({ length: shape.length }, (_, k) =>
				readShape(memory, elementAddress(memory, at, shape, k), shape.element),
			);
	}
}

function writeShape(memory: ArrayBuffer, at: number, shape: Shape, value: unknown): void {
	switch (shape.k) {
		case "number":
			new Float64Array(memory, at, 1)[0] = Number(value);
			return;
		case "array": {
			const src = value as ArrayBufferView;
			const bytes = new Uint8Array(src.buffer, src.byteOffset, src.byteLength);
			new Uint8Array(memory, at, src.byteLength).set(bytes);
			return;
		}
		case "record": {
			const record = value as Record<string, unknown>;
			for (const [name, f] of Object.entries(shape.fields)) writeField(memory, at, f, record[name]);
			return;
		}
		case "records": {
			const list = value as readonly unknown[];
			pointElementsHome(memory, at, shape);
			for (let k = 0; k < shape.length; k++)
				writeShape(memory, at + k * shape.element.size, shape.element, list[k]);
		}
	}
}
