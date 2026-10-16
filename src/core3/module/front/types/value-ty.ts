/**
 * The type of a fresh state value, and of a config value. State holds
 * numbers, typed arrays, records and arrays of records of one shape
 * (front/state/check-state.ts); config holds plain values, which fold.
 */

import { elementTypeOf } from "./element-type";
import { BOOL, NUM, type RecordRef, type Ty, UNKNOWN, known, ref } from "./ty";

export function stateTy(value: unknown): Ty {
	if (typeof value === "number") return NUM;
	if (typeof value === "boolean") return BOOL;
	const type = elementTypeOf(value);
	if (type !== null) return ref({ k: "array", type, length: (value as ArrayLike<number>).length });
	if (Array.isArray(value)) {
		const first = value[0];
		return isRecord(first) ? ref({ k: "records", length: value.length, element: recordRef(first) }) : UNKNOWN;
	}
	return isRecord(value) ? ref(recordRef(value)) : UNKNOWN;
}

/** A config value folds when it is plain; anything else no backend holds. */
export function configTy(value: unknown): Ty {
	if (value === undefined || value === null) return known(value);
	const t = typeof value;
	return t === "number" || t === "string" || t === "boolean"
		? known(value as number | string | boolean)
		: UNKNOWN;
}

export function recordRef(value: Record<string, unknown>): RecordRef {
	const fields: Record<string, Ty> = {};
	for (const [name, v] of Object.entries(value)) fields[name] = stateTy(v);
	return { k: "record", fields };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		!ArrayBuffer.isView(value)
	);
}
