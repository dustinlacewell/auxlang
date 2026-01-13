/**
 * Deep clone that preserves TypedArrays.
 * JSON.parse/stringify loses TypedArrays - they become plain objects.
 */
export function deepCloneState(obj: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		result[key] = cloneValue(value);
	}
	return result;
}

function cloneValue(value: unknown): unknown {
	if (value instanceof Float32Array) return new Float32Array(value);
	if (value instanceof Float64Array) return new Float64Array(value);
	if (value instanceof Int32Array) return new Int32Array(value);
	if (value instanceof Uint8Array) return new Uint8Array(value);
	if (Array.isArray(value)) return value.map(cloneValue);
	if (value && typeof value === "object" && !ArrayBuffer.isView(value)) {
		return deepCloneState(value as Record<string, unknown>);
	}
	return value;
}
