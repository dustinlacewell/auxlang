/**
 * State-shape fit (MANIFESTO §6.2): carried state migrates only when it has
 * the same shape as the new module's fresh state — the same keys and the same
 * value kinds (number, typed-array type, array, nested record), recursively,
 * and the same array and typed-array lengths. State is fixed-shape (§5), so a
 * changed length means the module was resized (a config or sample-rate edit)
 * and must start fresh. A state that does not fit makes that one module start
 * fresh. The engine-injected `__lane` and `__scratch` are not part of the
 * shape.
 */

const ENGINE_KEYS = new Set(["__lane", "__scratch"]);

export function stateFits(carried: unknown, fresh: unknown): boolean {
	if (ArrayBuffer.isView(fresh)) return typedArrayFits(carried, fresh);
	if (Array.isArray(fresh)) return arrayFits(carried, fresh);
	if (fresh !== null && typeof fresh === "object")
		return recordFits(carried, fresh as Record<string, unknown>);
	return typeof carried === typeof fresh && (carried === null) === (fresh === null);
}

function typedArrayFits(carried: unknown, fresh: ArrayBufferView): boolean {
	return (
		ArrayBuffer.isView(carried) &&
		carried.constructor === fresh.constructor &&
		carried.byteLength === fresh.byteLength
	);
}

function arrayFits(carried: unknown, fresh: readonly unknown[]): boolean {
	return (
		Array.isArray(carried) &&
		carried.length === fresh.length &&
		fresh.every((item, i) => stateFits(carried[i], item))
	);
}

function recordFits(carried: unknown, fresh: Record<string, unknown>): boolean {
	if (carried === null || typeof carried !== "object") return false;
	if (Array.isArray(carried) || ArrayBuffer.isView(carried)) return false;
	const old = carried as Record<string, unknown>;
	const keys = shapeKeys(fresh);
	return (
		keys.length === shapeKeys(old).length &&
		keys.every((key) => key in old && stateFits(old[key], fresh[key]))
	);
}

function shapeKeys(record: Record<string, unknown>): string[] {
	return Object.keys(record).filter((key) => !ENGINE_KEYS.has(key));
}
