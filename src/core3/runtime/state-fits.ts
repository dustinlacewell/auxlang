/**
 * State-shape fit (MANIFESTO §6.2): carried state migrates only when it has
 * the same shape as the new module's fresh state — the same keys and the same
 * value kinds (number, typed-array type, array, nested record), recursively
 * through records. Array lengths are not compared. A state that does not fit
 * makes that one module start fresh. The engine-injected `__lane` is not part
 * of the shape.
 */

const ENGINE_KEYS = new Set(["__lane"]);

export function stateFits(carried: unknown, fresh: unknown): boolean {
	if (ArrayBuffer.isView(fresh))
		return ArrayBuffer.isView(carried) && carried.constructor === fresh.constructor;
	if (Array.isArray(fresh)) return Array.isArray(carried);
	if (fresh !== null && typeof fresh === "object")
		return recordFits(carried, fresh as Record<string, unknown>);
	return typeof carried === typeof fresh && (carried === null) === (fresh === null);
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
