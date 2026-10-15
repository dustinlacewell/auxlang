/**
 * The memory shapes of a lane's built state (layout/state-shape.ts). Every
 * field has one: a value with no memory form (a string, null, a BigInt
 * array, records of differing shapes) is a loud error naming the field, so
 * the layout sees the whole state and a layout fit (carry/lane-fits.ts)
 * agrees with the JS `stateFits`. The checker refuses such values in a
 * module's own fresh state (module/tick-subset/check-state.ts); this catches
 * a state that takes them only under some config. `__scratch` is the
 * engine's derived data: its tables live in the table heap
 * (host/table-heap.ts), not in the lane.
 */

import { ELEMENT_BYTES, elementTypeOf } from "../layout/element-type";
import type { Field, RecordShape, RecordsShape, Shape } from "../layout/state-shape";

const NUMBER: Shape = { k: "number" };
const SCRATCH = "__scratch";

/** A lane's non-scalar top-level fields, each placed by `take(bytes)` (an 8-aligned address). */
export function planAggregates(
	state: Record<string, unknown>,
	take: (bytes: number) => number,
): Record<string, Field> {
	const fields: Record<string, Field> = {};
	for (const [name, value] of Object.entries(state)) {
		if (name === SCRATCH) continue;
		const shape = shapeOf(value, name);
		if (shape.k === "number") continue;
		fields[name] = { offset: take(sizeOf(shape)), shape };
	}
	return fields;
}

/** `value`'s memory shape; `path` names it in the error when it has none. */
export function shapeOf(value: unknown, path: string): Shape {
	if (typeof value === "number") return NUMBER;
	const type = elementTypeOf(value);
	if (type !== null) return { k: "array", type, length: (value as ArrayLike<number>).length };
	if (Array.isArray(value)) return recordsShape(value, path);
	if (isRecord(value)) return recordShape(value, path);
	throw new Error(
		`wasm: state field '${path}' has no memory form — state holds numbers, typed arrays, records and arrays of records`,
	);
}

/** Bytes a shape takes, a multiple of 8. */
export function sizeOf(shape: Shape): number {
	switch (shape.k) {
		case "number":
			return 8;
		case "array":
			return Math.ceil((shape.length * ELEMENT_BYTES[shape.type]) / 8) * 8;
		case "record":
			return shape.size;
		case "records":
			return shape.length * shape.element.size;
	}
}

function recordShape(value: Record<string, unknown>, path: string): RecordShape {
	const fields: Record<string, Field> = {};
	let size = 0;
	for (const [name, v] of Object.entries(value)) {
		const shape = shapeOf(v, `${path}.${name}`);
		fields[name] = { offset: size, shape };
		size += sizeOf(shape);
	}
	return { k: "record", size, fields };
}

/** A non-empty array of records that all have the first one's shape. */
function recordsShape(list: readonly unknown[], path: string): RecordsShape {
	const first = list[0];
	if (!isRecord(first)) throw new Error(`wasm: state field '${path}' is not an array of records`);
	const element = recordShape(first, `${path}[0]`);
	const key = JSON.stringify(element);
	list.forEach((item, k) => {
		if (!isRecord(item) || JSON.stringify(recordShape(item, `${path}[${k}]`)) !== key)
			throw new Error(`wasm: state field '${path}' holds records of differing shapes`);
	});
	return { k: "records", length: list.length, element };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		!ArrayBuffer.isView(value)
	);
}
