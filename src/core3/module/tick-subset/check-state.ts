/**
 * Arrays in module state are typed arrays. A typed array has one element
 * type and a fixed length, so every backend can hold it the same way (WASM
 * keeps it in linear memory in that type). A plain array of numbers has
 * neither, and is a loud error naming the field. An array of records stays
 * allowed; its records' fields are checked the same way.
 */

export function checkStateArrays(state: Record<string, unknown>, owner: string): void {
	for (const [name, value] of Object.entries(state)) checkValue(value, name, owner);
}

function checkValue(value: unknown, path: string, owner: string): void {
	if (Array.isArray(value)) {
		if (value.length === 0 || !value.every(isRecord))
			throw new Error(
				`${owner}: state field '${path}' is a plain array — make it a typed array (Float64Array, Float32Array, Int32Array, ...) in state()`,
			);
		value.forEach((item, k) => checkRecord(item, `${path}[${k}]`, owner));
		return;
	}
	if (isRecord(value)) checkRecord(value, path, owner);
}

function checkRecord(record: Record<string, unknown>, path: string, owner: string): void {
	for (const [name, value] of Object.entries(record)) checkValue(value, `${path}.${name}`, owner);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		!ArrayBuffer.isView(value)
	);
}
