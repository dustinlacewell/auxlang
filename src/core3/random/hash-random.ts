/**
 * `hashRandom(key, seed)`: a uniform value in [0, 1) that is the same every
 * time the same key comes back under the same seed. Pure; keeps no position,
 * so it is the tool for "the value that belongs to step 7", where a stream
 * (random/lib/next-rng.js) is the tool for "the next value". The host side of
 * a tick's `hashRandom(key)`: the same random/lib functions, a string key
 * hashed by fnv1a32 as a tick's string literal key is folded.
 */

import { fnv1a32 } from "../hash/fnv1a32";
import { randomFunctions } from "../module/bind-random/random-functions";

const { hashKey, hashNumber } = randomFunctions;

export function hashRandom(key: number | string, seed: number): number {
	return typeof key === "number" ? hashNumber(key, seed) : hashKey(fnv1a32(key), seed);
}
