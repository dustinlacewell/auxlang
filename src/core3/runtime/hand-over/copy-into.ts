/**
 * Copy a carried lane state's values into a fresh state of the same shape
 * (state-fits.ts) without allocating: numbers by assignment, typed arrays by
 * `set`, nested records and arrays element by element. The fresh objects
 * were built ahead, off the swap's block; the swap only moves values.
 */

type Writable = Record<string, unknown>;
type TypedArray = { set(source: ArrayLike<number>): void };

/** Copy `src`'s fields into `dst`, except the keys in `skip`. */
export function copyInto(dst: Writable, src: Writable, skip: ReadonlySet<string>): void {
	for (const key of Object.keys(src)) {
		if (!skip.has(key)) dst[key] = copyValue(dst[key], src[key]);
	}
}

const NONE: ReadonlySet<string> = new Set();

function copyValue(dst: unknown, src: unknown): unknown {
	if (ArrayBuffer.isView(src)) {
		(dst as TypedArray).set(src as unknown as ArrayLike<number>);
		return dst;
	}
	if (Array.isArray(src)) {
		const out = dst as unknown[];
		for (let i = 0; i < src.length; i++) out[i] = copyValue(out[i], src[i]);
		return out;
	}
	if (src !== null && typeof src === "object") {
		copyInto(dst as Writable, src as Writable, NONE);
		return dst;
	}
	return src;
}
