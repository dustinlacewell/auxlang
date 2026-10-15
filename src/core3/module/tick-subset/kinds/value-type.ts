/**
 * What the kind check (check-kinds.ts) knows about a value: a boolean, a
 * number, state or config data it can look into (the fresh value itself),
 * the inputs or outputs record, anything else (a string, `undefined`), or
 * unknown. Only `bool` against `num` is ever a conflict.
 */

export type ValueType =
	| { readonly k: "bool" }
	| { readonly k: "num" }
	| { readonly k: "data"; readonly v: object }
	| { readonly k: "ins" }
	| { readonly k: "outs" }
	| { readonly k: "other" }
	| { readonly k: "unknown" };

export const BOOL: ValueType = { k: "bool" };
export const NUM: ValueType = { k: "num" };
export const OTHER: ValueType = { k: "other" };
export const UNKNOWN: ValueType = { k: "unknown" };

/** The type of a fresh state or config value. */
export function typeOfValue(v: unknown): ValueType {
	if (typeof v === "number") return NUM;
	if (typeof v === "boolean") return BOOL;
	if (typeof v === "object" && v !== null) return { k: "data", v };
	return OTHER;
}

/** One is a boolean and the other a number. */
export function conflict(a: ValueType, b: ValueType): boolean {
	return (a.k === "bool" && b.k === "num") || (a.k === "num" && b.k === "bool");
}

/** Two paths of one value: their common type, or unknown. */
export function join(a: ValueType, b: ValueType): ValueType {
	return a.k === b.k && a.k !== "data" ? a : UNKNOWN;
}

const ids = new WeakMap<object, number>();
let nextId = 0;

/** A key for memoising a helper on its argument types: data by identity. */
export function typeKey(t: ValueType): string {
	if (t.k !== "data") return t.k;
	let id = ids.get(t.v);
	if (id === undefined) {
		id = nextId++;
		ids.set(t.v, id);
	}
	return `data${id}`;
}
