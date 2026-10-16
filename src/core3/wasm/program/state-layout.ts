/**
 * The memory shapes of a lane's built state (layout/state-shape.ts). Every
 * field has one: a value with no memory form (a string, null, a BigInt
 * array, records of differing shapes) is a loud error naming the field, so
 * the layout sees the whole state and a layout fit (carry/lane-fits.ts)
 * agrees with the JS `stateFits`. The checker refuses such values in a
 * module's own fresh state (module/front/state/check-state.ts); this catches
 * a state that takes them only under some config. `__scratch` is the
 * engine's derived data: its tables live in the table heap
 * (host/table-heap.ts), not in the lane.
 */

import { stateShapeOf } from "../../module/front/state/state-shape-of";
import { elementTypeOf } from "../../module/front/types/element-type";
import { tyKey } from "../../module/front/types/ty";
import { stateTy } from "../../module/front/types/value-ty";
import { ELEMENT_BYTES } from "../layout/element-type";
import type { Field, RecordShape, RecordsShape, Shape } from "../layout/state-shape";

const NUMBER: Shape = { k: "number" };
const SCRATCH = "__scratch";

/**
 * What the code rebinds: field names (front/scope/field-rebinds.ts) and the
 * type keys of arrays of records whose elements it rebinds
 * (front/types/element-rebinds.ts).
 */
export interface Rebinds {
	readonly fields: ReadonlySet<string>;
	readonly elements: ReadonlySet<string>;
}

/**
 * A lane's non-scalar top-level fields, each placed by `take(bytes)` (an
 * 8-aligned address); a rebound field also takes its pointer slot.
 */
export function planAggregates(
	state: Record<string, unknown>,
	rebound: Rebinds,
	take: (bytes: number) => number,
): Record<string, Field> {
	const fields: Record<string, Field> = {};
	for (const [name, value] of Object.entries(state)) {
		if (name === SCRATCH) continue;
		const shape = shapeOf(value, name, rebound);
		if (shape.k === "number") continue;
		const offset = take(sizeOf(shape));
		fields[name] = rebound.fields.has(name)
			? { offset, shape, pointer: take(8) }
			: { offset, shape };
	}
	return fields;
}

/** `value`'s memory shape; `path` names it in the error when it has none. */
function shapeOf(value: unknown, path: string, rebound: Rebinds): Shape {
	if (typeof value === "number") return NUMBER;
	const type = elementTypeOf(value);
	if (type !== null) return { k: "array", type, length: (value as ArrayLike<number>).length };
	if (Array.isArray(value)) return recordsShape(value, path, rebound);
	if (isRecord(value)) return recordShape(value, path, rebound);
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
			return (
				shape.length * shape.element.size +
				(shape.pointers === undefined ? 0 : tableBytes(shape.length))
			);
	}
}

/** An element pointer table: an i32 per element, rounded to 8 bytes. */
function tableBytes(length: number): number {
	return Math.ceil((length * 4) / 8) * 8;
}

/** Each field at its offset; a rebound array or record field's pointer slot right after its storage. */
function recordShape(value: Record<string, unknown>, path: string, rebound: Rebinds): RecordShape {
	const fields: Record<string, Field> = {};
	let size = 0;
	for (const [name, v] of Object.entries(value)) {
		const shape = shapeOf(v, `${path}.${name}`, rebound);
		const offset = size;
		size += sizeOf(shape);
		if (shape.k === "number" || !rebound.fields.has(name)) {
			fields[name] = { offset, shape };
			continue;
		}
		fields[name] = { offset, shape, pointer: size };
		size += 8;
	}
	return { k: "record", size, fields };
}

/**
 * A non-empty array of records that all have the first one's shape; an array
 * whose elements are rebound has its pointer table after the records.
 */
function recordsShape(list: readonly unknown[], path: string, rebound: Rebinds): RecordsShape {
	const first = list[0];
	if (!isRecord(first)) throw new Error(`wasm: state field '${path}' is not an array of records`);
	const element = recordShape(first, `${path}[0]`, rebound);
	const key = JSON.stringify(element);
	list.forEach((item, k) => {
		if (!isRecord(item) || JSON.stringify(recordShape(item, `${path}[${k}]`, rebound)) !== key)
			throw new Error(`wasm: state field '${path}' holds records of differing shapes`);
	});
	const length = list.length;
	if (!rebound.elements.has(tyKey(stateTy(stateShapeOf(list)))))
		return { k: "records", length, element };
	return { k: "records", length, element, pointers: length * element.size };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		!ArrayBuffer.isView(value)
	);
}
