/**
 * Structural clone for module state: plain data + typed arrays.
 * Used by state migration (clone-and-carry) and collectState snapshots.
 */

interface TypedArrayLike {
	readonly length: number;
	readonly constructor: new (src: TypedArrayLike) => TypedArrayLike;
}

export function deepClone<T>(value: T): T {
	if (value === null || typeof value !== "object") return value;
	if (ArrayBuffer.isView(value)) {
		if (value instanceof DataView) throw new Error("deepClone: DataView is not valid module state");
		const ta = value as unknown as TypedArrayLike;
		return new ta.constructor(ta) as unknown as T;
	}
	if (Array.isArray(value)) return value.map(deepClone) as unknown as T;
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(value)) {
		out[key] = deepClone((value as Record<string, unknown>)[key]);
	}
	return out as T;
}
