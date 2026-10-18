/**
 * Deterministic randomness for patterns. All chance flows through
 * hash01(seed, path, ...ints) — integer avalanche hashing (random/lib's
 * murmur3 finalizer, the text a tick runs), identical across threads and
 * directions of time. Never Math.random.
 */

import { randomFunctions } from "../dsp/bind-random/random-functions";

const { avalanche } = randomFunctions;

/**
 * Uniform [0,1) from (seed, AST path, and any number of trailing integer
 * coordinates). Pure; scrub-safe. Degrade passes the event's absolute
 * whole.begin rational (n, d) so every event position rolls independently
 * while staying identical across renders, sample rates, and threads.
 */
export function hash01(seed: number, path: number, ...coords: number[]): number {
	let h = avalanche((seed | 0) ^ 0x9e3779b9);
	h = avalanche(h ^ Math.imul(path | 0, 0x85ebca6b));
	for (const c of coords) h = avalanche(h ^ Math.imul(c | 0, 0xc2b2ae35));
	return h / 0x100000000;
}
