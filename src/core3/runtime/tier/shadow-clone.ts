/**
 * The shadow copy of a driver's bound values: plain objects, arrays and
 * typed arrays are copied, so the shadow never writes what the real driver
 * reads; functions and class instances (tick fns, helpers, read-only config
 * such as patterns) are shared. One cloner copies a whole binding set: an
 * object bound twice, or reached twice, becomes one copy, so aliasing holds.
 *
 * Code optimized on the shadow fits the real values only if both have the
 * same hidden classes. A copy has its source's hidden class only when the
 * source is itself a copy made this way (a spread or a literal source gives
 * a different one). So a tier-up engine first copies its own values with a
 * cloner (engine.ts), and the shadow copies those.
 */

interface TypedArrayLike {
	readonly constructor: new (src: TypedArrayLike) => TypedArrayLike;
}

export function shadowCloner(): (value: unknown) => unknown {
	const copies = new Map<object, unknown>();
	const clone = (value: unknown): unknown => {
		if (value === null || typeof value !== "object") return value;
		const seen = copies.get(value);
		if (seen !== undefined) return seen;
		if (ArrayBuffer.isView(value)) {
			const ta = value as unknown as TypedArrayLike;
			const copy = new ta.constructor(ta);
			copies.set(value, copy);
			return copy;
		}
		if (Array.isArray(value)) {
			const copy: unknown[] = [];
			copies.set(value, copy);
			for (const item of value) copy.push(clone(item));
			return copy;
		}
		if (!isPlain(value)) {
			copies.set(value, value);
			return value;
		}
		const copy: Record<string, unknown> = {};
		copies.set(value, copy);
		for (const key of Object.keys(value))
			copy[key] = clone((value as Record<string, unknown>)[key]);
		return copy;
	};
	return clone;
}

function isPlain(value: object): boolean {
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}
