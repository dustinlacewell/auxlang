/**
 * The type of a fresh state value, read from its shape
 * (front/state/state-shape.ts), and of a config value. State holds numbers,
 * typed arrays, records and arrays of records of one shape
 * (front/state/check-state.ts); config holds plain values, which fold. A
 * list types as an array of records of its first item's shape when that
 * item is a record.
 */

import type { RecordState, StateShape } from "../state/state-shape";
import { BOOL, NUM, type RecordRef, type Ty, UNKNOWN, known, ref } from "./ty";

export function stateTy(shape: StateShape): Ty {
	switch (shape.k) {
		case "number":
			return NUM;
		case "boolean":
			return BOOL;
		case "array":
			return ref({ k: "array", type: shape.type, length: shape.length });
		case "record":
			return ref(recordRef(shape));
		case "records":
			return ref({ k: "records", length: shape.length, element: recordRef(shape.element) });
		case "list": {
			const first = shape.items[0];
			return first?.k === "record"
				? ref({ k: "records", length: shape.items.length, element: recordRef(first) })
				: UNKNOWN;
		}
		case "other":
			return UNKNOWN;
	}
}

/** A config value folds when it is plain; anything else no backend holds. */
export function configTy(value: unknown): Ty {
	if (value === undefined || value === null) return known(value);
	const t = typeof value;
	return t === "number" || t === "string" || t === "boolean"
		? known(value as number | string | boolean)
		: UNKNOWN;
}

export function recordRef(shape: RecordState): RecordRef {
	const fields: Record<string, Ty> = {};
	for (const [name, field] of Object.entries(shape.fields)) fields[name] = stateTy(field);
	return { k: "record", fields };
}
