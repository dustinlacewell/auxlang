/**
 * Module state holds numbers, typed arrays, records and arrays of records
 * that share one shape (state-shape.ts): every backend can hold those the
 * same way (WASM keeps them in linear memory, wasm/program/state-layout.ts).
 * Anything else is a loud error naming the field:
 *
 * - a plain array of numbers has no element type and no fixed length;
 * - a boolean: JS keeps `true`, which `=== 1` is not, while a backend's
 *   number slot cannot tell them apart;
 * - a string, null, undefined, a BigInt or BigInt array, a function: no
 *   number form at all;
 * - records of differing shapes in one array (keys, in order, and kinds).
 */

import type { ListState, RecordState, StateShape } from "./state-shape";
import { stateShapeOf } from "./state-shape-of";

export function checkStateValues(state: Record<string, unknown>, owner: string): void {
	checkRecord(stateShapeOf(state) as RecordState, "", owner);
}

function checkShape(shape: StateShape, path: string, owner: string): void {
	switch (shape.k) {
		case "number":
		case "array":
			return;
		case "boolean":
			throw new Error(
				`${owner}: state field '${path}' is a boolean — keep it as a number (0 or 1) in state()`,
			);
		case "record":
			checkRecord(shape, `${path}.`, owner);
			return;
		case "records":
			checkRecord(shape.element, `${path}[0].`, owner);
			return;
		case "list":
			checkList(shape, path, owner);
			return;
		case "other":
			throw new Error(
				`${owner}: state field '${path}' is ${shape.what} — state holds numbers, typed arrays, records and arrays of records`,
			);
	}
}

/** `prefix` goes before each field name: "" at the top, "a." or "a[0]." below. */
function checkRecord(record: RecordState, prefix: string, owner: string): void {
	for (const [name, shape] of Object.entries(record.fields))
		checkShape(shape, `${prefix}${name}`, owner);
}

function checkList(list: ListState, path: string, owner: string): void {
	const { items } = list;
	if (items.length === 0 || !items.every((item) => item.k === "record"))
		throw new Error(
			`${owner}: state field '${path}' is a plain array — make it a typed array (Float64Array, Float32Array, Int32Array, ...) in state()`,
		);
	items.forEach((item, k) => checkRecord(item as RecordState, `${path}[${k}].`, owner));
	throw new Error(`${owner}: state field '${path}' holds records of differing shapes`);
}
