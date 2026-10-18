/**
 * A state value's shape (state-shape.ts). Pure; every value has one. A lane's
 * state shape leaves out `__scratch`, the engine's derived data that no tick
 * reads as a field.
 */

import { elementTypeOf } from "../types/element-type";
import type { RecordState, StateShape } from "./state-shape";

const SCRATCH = "__scratch";
const NUMBER: StateShape = { k: "number" };
const BOOLEAN: StateShape = { k: "boolean" };

export function stateShapeOf(value: unknown): StateShape {
	if (typeof value === "number") return NUMBER;
	if (typeof value === "boolean") return BOOLEAN;
	const type = elementTypeOf(value);
	if (type !== null) return { k: "array", type, length: (value as ArrayLike<number>).length };
	if (ArrayBuffer.isView(value))
		return { k: "other", what: `a ${value.constructor.name}`, bytes: value.byteLength };
	if (Array.isArray(value)) return arrayShapeOf(value);
	if (isRecord(value)) return recordShapeOf(value);
	return { k: "other", what: value === null ? "null" : `a ${typeof value}` };
}

export function laneShapeOf(state: Readonly<Record<string, unknown>>): RecordState {
	const fields: Record<string, StateShape> = {};
	for (const [name, value] of Object.entries(state))
		if (name !== SCRATCH) fields[name] = stateShapeOf(value);
	return { k: "record", fields };
}

function recordShapeOf(value: Record<string, unknown>): RecordState {
	const fields: Record<string, StateShape> = {};
	for (const [name, v] of Object.entries(value)) fields[name] = stateShapeOf(v);
	return { k: "record", fields };
}

/** An array of records of one shape, or else a list. */
function arrayShapeOf(list: readonly unknown[]): StateShape {
	const items = list.map(stateShapeOf);
	const first = items[0];
	if (first?.k === "record" && items.every((item) => sameShape(item, first)))
		return { k: "records", length: items.length, element: first };
	return { k: "list", items };
}

/** The same shape, record keys in the same order. */
function sameShape(a: StateShape, b: StateShape): boolean {
	switch (a.k) {
		case "number":
		case "boolean":
			return a.k === b.k;
		case "array":
			return b.k === "array" && a.type === b.type && a.length === b.length;
		case "record":
			return b.k === "record" && sameFields(a, b);
		case "records":
			return b.k === "records" && a.length === b.length && sameShape(a.element, b.element);
		case "list":
			return (
				b.k === "list" &&
				a.items.length === b.items.length &&
				a.items.every((item, i) => sameShape(item, b.items[i] as StateShape))
			);
		case "other":
			return b.k === "other" && a.what === b.what && a.bytes === b.bytes;
	}
}

function sameFields(a: RecordState, b: RecordState): boolean {
	const names = Object.keys(a.fields);
	const others = Object.keys(b.fields);
	return (
		names.length === others.length &&
		names.every(
			(name, i) =>
				name === others[i] && sameShape(a.fields[name] as StateShape, b.fields[name] as StateShape),
		)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		!ArrayBuffer.isView(value)
	);
}
