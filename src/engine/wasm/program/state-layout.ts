/**
 * The memory shapes of a lane's built state (layout/state-shape.ts): the
 * front end's state shape (module/front/state/state-shape.ts) with offsets
 * on top. Every field has one: a value with no memory form (a boolean, a
 * string, null, a BigInt array, records of differing shapes) is a loud error
 * naming the field, so the layout sees the whole state. The checker refuses
 * such values in a module's own fresh state
 * (module/front/state/check-state.ts); this catches a state that takes them
 * only under some config. The lane's shape leaves out `__scratch`, the
 * engine's derived data: its tables live in the table heap
 * (host/table-heap.ts), not in the lane.
 */

import type {
	ListState,
	RecordState,
	RecordsState,
	StateShape,
} from "../../module/front/state/state-shape";
import { tyKey } from "../../module/front/types/ty";
import { stateTy } from "../../module/front/types/value-ty";
import { ELEMENT_BYTES } from "../layout/element-type";
import type { Field, RecordShape, RecordsShape, Shape } from "../layout/state-shape";

const NUMBER: Shape = { k: "number" };

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
	state: RecordState,
	rebound: Rebinds,
	take: (bytes: number) => number,
): Record<string, Field> {
	const fields: Record<string, Field> = {};
	for (const [name, value] of Object.entries(state.fields)) {
		const shape = layoutOf(value, name, rebound);
		if (shape.k === "number") continue;
		const offset = take(sizeOf(shape));
		fields[name] = rebound.fields.has(name)
			? { offset, shape, pointer: take(8) }
			: { offset, shape };
	}
	return fields;
}

/** A state shape's memory shape; `path` names it in the error when it has none. */
function layoutOf(shape: StateShape, path: string, rebound: Rebinds): Shape {
	switch (shape.k) {
		case "number":
			return NUMBER;
		case "array":
			return shape;
		case "record":
			return recordShape(shape, path, rebound);
		case "records":
			return recordsShape(shape, path, rebound);
		case "list":
			return listError(shape, path, rebound);
		case "boolean":
		case "other":
			throw new Error(
				`wasm: state field '${path}' has no memory form — state holds numbers, typed arrays, records and arrays of records`,
			);
	}
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
function recordShape(record: RecordState, path: string, rebound: Rebinds): RecordShape {
	const fields: Record<string, Field> = {};
	let size = 0;
	for (const [name, value] of Object.entries(record.fields)) {
		const shape = layoutOf(value, `${path}.${name}`, rebound);
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

/** Records at a stride; an array whose elements are rebound has its pointer table after the records. */
function recordsShape(records: RecordsState, path: string, rebound: Rebinds): RecordsShape {
	const element = recordShape(records.element, `${path}[0]`, rebound);
	const { length } = records;
	if (!rebound.elements.has(tyKey(stateTy(records)))) return { k: "records", length, element };
	return { k: "records", length, element, pointers: length * element.size };
}

/** A list has no memory form: the error names a field inside an item first, as the items come. */
function listError(list: ListState, path: string, rebound: Rebinds): never {
	if (list.items[0]?.k !== "record")
		throw new Error(`wasm: state field '${path}' is not an array of records`);
	list.items.forEach((item, k) => {
		if (item.k === "record") recordShape(item, `${path}[${k}]`, rebound);
		else throw new Error(`wasm: state field '${path}' holds records of differing shapes`);
	});
	throw new Error(`wasm: state field '${path}' holds records of differing shapes`);
}
