/**
 * Module state holds numbers, typed arrays, records and arrays of records
 * that share one shape: every backend can hold those the same way (WASM
 * keeps them in linear memory, wasm/program/state-layout.ts), and a layout
 * fit then sees every field the JS `stateFits` sees. Anything else is a loud
 * error naming the field:
 *
 * - a plain array of numbers has no element type and no fixed length;
 * - a boolean: JS keeps `true`, which `=== 1` is not, while a backend's
 *   number slot cannot tell them apart;
 * - a string, null, undefined, a BigInt or BigInt array, a function: no
 *   number form at all;
 * - records of differing shapes in one array (keys, in order, and kinds).
 */

export function checkStateValues(state: Record<string, unknown>, owner: string): void {
	for (const [name, value] of Object.entries(state)) checkValue(value, name, owner);
}

function checkValue(value: unknown, path: string, owner: string): void {
	if (typeof value === "number" || isNumberArray(value)) return;
	if (typeof value === "boolean")
		throw new Error(
			`${owner}: state field '${path}' is a boolean — keep it as a number (0 or 1) in state()`,
		);
	if (Array.isArray(value)) checkRecords(value, path, owner);
	else if (isRecord(value)) checkRecord(value, path, owner);
	else
		throw new Error(
			`${owner}: state field '${path}' is ${describe(value)} — state holds numbers, typed arrays, records and arrays of records`,
		);
}

function checkRecords(list: readonly unknown[], path: string, owner: string): void {
	if (list.length === 0 || !list.every(isRecord))
		throw new Error(
			`${owner}: state field '${path}' is a plain array — make it a typed array (Float64Array, Float32Array, Int32Array, ...) in state()`,
		);
	list.forEach((item, k) => checkRecord(item, `${path}[${k}]`, owner));
	const shape = shapeKey(list[0]);
	if (!list.every((item) => shapeKey(item) === shape))
		throw new Error(`${owner}: state field '${path}' holds records of differing shapes`);
}

function checkRecord(record: Record<string, unknown>, path: string, owner: string): void {
	for (const [name, value] of Object.entries(record)) checkValue(value, `${path}.${name}`, owner);
}

/** A checked value's shape as text: keys in order, kinds, typed-array types and lengths. */
function shapeKey(value: unknown): string {
	if (typeof value === "number") return "n";
	if (ArrayBuffer.isView(value))
		return `${value.constructor.name}(${(value as unknown as ArrayLike<number>).length})`;
	if (Array.isArray(value)) return `[${value.map(shapeKey).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.map((k) => `${k}:${shapeKey(record[k])}`)
		.join(",")}}`;
}

function isNumberArray(value: unknown): boolean {
	return (
		ArrayBuffer.isView(value) &&
		!(value instanceof DataView) &&
		!(value instanceof BigInt64Array) &&
		!(value instanceof BigUint64Array)
	);
}

function describe(value: unknown): string {
	if (value === null) return "null";
	if (ArrayBuffer.isView(value)) return `a ${value.constructor.name}`;
	return `a ${typeof value}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		!ArrayBuffer.isView(value)
	);
}
