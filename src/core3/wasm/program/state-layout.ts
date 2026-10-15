/**
 * The memory shapes of a lane's built state (layout/state-shape.ts). A value
 * with no memory form (a string, a boolean, which an f64 would turn into a
 * number (compile/one-type.ts), a BigInt array, records of differing shapes)
 * gets no shape; a tick that reads it fails to compile, naming the field.
 */

import { ELEMENT_BYTES, elementTypeOf } from "../layout/element-type";
import type { Field, RecordShape, RecordsShape, Shape } from "../layout/state-shape";

const NUMBER: Shape = { k: "number" };

/** A lane's non-scalar top-level fields, each placed by `take(bytes)` (an 8-aligned address). */
export function planAggregates(
	state: Record<string, unknown>,
	take: (bytes: number) => number,
): Record<string, Field> {
	const fields: Record<string, Field> = {};
	for (const [name, value] of Object.entries(state)) {
		const shape = shapeOf(value);
		if (shape === null || shape.k === "number") continue;
		fields[name] = { offset: take(sizeOf(shape)), shape };
	}
	return fields;
}

export function shapeOf(value: unknown): Shape | null {
	if (typeof value === "number") return NUMBER;
	const type = elementTypeOf(value);
	if (type !== null) return { k: "array", type, length: (value as ArrayLike<number>).length };
	if (Array.isArray(value)) return recordsShape(value);
	if (isRecord(value)) return recordShape(value);
	return null;
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

function recordShape(value: Record<string, unknown>): RecordShape {
	const fields: Record<string, Field> = {};
	let size = 0;
	for (const [name, v] of Object.entries(value)) {
		const shape = shapeOf(v);
		if (shape === null) continue;
		fields[name] = { offset: size, shape };
		size += sizeOf(shape);
	}
	return { k: "record", size, fields };
}

/** A non-empty array of records that all have the first one's shape. */
function recordsShape(list: readonly unknown[]): RecordsShape | null {
	const first = list[0];
	if (!isRecord(first)) return null;
	const element = recordShape(first);
	const key = JSON.stringify(element);
	for (const item of list)
		if (!isRecord(item) || JSON.stringify(recordShape(item)) !== key) return null;
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
