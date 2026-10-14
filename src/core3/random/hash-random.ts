/**
 * `hashRandom(key, seed)`: a uniform value in [0, 1) that is the same every
 * time the same key comes back under the same seed. Pure; keeps no position,
 * so it is the tool for "the value that belongs to step 7", where a stream
 * (next-random.ts) is the tool for "the next value". Allocates nothing.
 */

import { fnv1a32 } from "../hash/fnv1a32";
import { avalanche } from "../pattern/random";

export function hashRandom(key: number | string, seed: number): number {
	const k = typeof key === "number" ? numberKey(key) : fnv1a32(key);
	return avalanche(avalanche((seed | 0) ^ 0x9e3779b9) ^ k) / 0x100000000;
}

/** Whole and fractional parts both count, so 1.25 and 1.5 are different keys. */
function numberKey(key: number): number {
	const whole = Math.floor(key);
	const frac = ((key - whole) * 0x100000000) >>> 0;
	return avalanche(whole | 0) ^ Math.imul(frac, 0xc2b2ae35);
}
