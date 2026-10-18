/**
 * auxlang's random library (random/lib) is one text for every backend. Its
 * host build gives the streams and hashes core3 has always given (the
 * reference implementations below are the TypeScript it replaced), and its
 * WASM build gives the same bits as its host build.
 */

import { describe, expect, it } from "vitest";

import { fnv1a32 } from "@/engine/hash/fnv1a32";
import { randomFunctions } from "@/engine/module/bind-random/random-functions";
import { RANDOM_HELPER_PREFIX } from "@/engine/module/bind-random/random-helpers";
import type { ArgShape } from "@/engine/wasm/compile/emit-context";
import { exportFunctions } from "../wasm/function-module";

/** The xorshift32 step core3 drew `Math.random()` from before random/lib. */
function referenceNext(x0: number): number {
	let x = x0;
	x ^= x << 13;
	x ^= x >>> 17;
	x ^= x << 5;
	return x >>> 0;
}

function referenceAvalanche(h: number): number {
	let x = h >>> 0;
	x ^= x >>> 16;
	x = Math.imul(x, 0x85ebca6b);
	x ^= x >>> 13;
	x = Math.imul(x, 0xc2b2ae35);
	x ^= x >>> 16;
	return x >>> 0;
}

/** hashRandom(key, seed) before random/lib. */
function referenceHash(key: number | string, seed: number): number {
	let k: number;
	if (typeof key === "number") {
		const whole = Math.floor(key);
		const frac = ((key - whole) * 0x100000000) >>> 0;
		k = referenceAvalanche(whole | 0) ^ Math.imul(frac, 0xc2b2ae35);
	} else k = fnv1a32(key);
	return referenceAvalanche(referenceAvalanche((seed | 0) ^ 0x9e3779b9) ^ k) / 0x100000000;
}

const run = (n: number): ArgShape[] => Array.from({ length: n }, () => ({ k: "run", kind: "f64" }));

const wasm = exportFunctions((calls) => ({
	nextRng: calls.helper(`${RANDOM_HELPER_PREFIX}nextRng`, run(1)),
	avalanche: calls.helper(`${RANDOM_HELPER_PREFIX}avalanche`, run(1)),
	hashKey: calls.helper(`${RANDOM_HELPER_PREFIX}hashKey`, run(2)),
	hashNumber: calls.helper(`${RANDOM_HELPER_PREFIX}hashNumber`, run(2)),
}));

const KEYS = [
	0,
	-0,
	1,
	-1,
	7.5,
	1.25,
	1.5,
	-3.75,
	2 ** 31,
	2 ** 32 + 0.5,
	-(2 ** 40),
	1e300,
	5e-324,
	Number.NaN,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
	...Array.from({ length: 200 }, (_, k) => (k * 0.37 - 30) * (k % 7 === 0 ? 1e6 : 1)),
];
const SEEDS = [0, 1, 7, -5, 0x7fffffff, 2 ** 32 - 1, 12345.5];

describe("random/lib", () => {
	it("steps the stream as before, on the host and in WASM", () => {
		const { nextRng } = randomFunctions;
		let x = 0x9e3779b9;
		let mismatches = 0;
		for (let k = 0; k < 100000; k++) {
			const next = referenceNext(x);
			if (nextRng(x) !== next || wasm.nextRng?.(x) !== next) mismatches++;
			x = next;
		}
		expect(mismatches).toBe(0);
	});

	it("avalanches as before, on the host and in WASM", () => {
		for (const h of [...KEYS, ...SEEDS, 0x85ebca6b, 0xffffffff]) {
			expect(randomFunctions.avalanche(h)).toBe(referenceAvalanche(h));
			expect(wasm.avalanche?.(h)).toBe(referenceAvalanche(h));
		}
	});

	it("hashes number keys as before, on the host and in WASM", () => {
		for (const seed of SEEDS)
			for (const key of KEYS) {
				const expected = referenceHash(key, seed);
				expect(randomFunctions.hashNumber(key, seed)).toBe(expected);
				expect(wasm.hashNumber?.(key, seed)).toBe(expected);
			}
	});

	it("hashes a string key's fnv1a32 as before, on the host and in WASM", () => {
		for (const seed of SEEDS)
			for (const key of ["", "kick", "snare", "a", "ü"]) {
				const expected = referenceHash(key, seed);
				expect(randomFunctions.hashKey(fnv1a32(key), seed)).toBe(expected);
				expect(wasm.hashKey?.(fnv1a32(key), seed)).toBe(expected);
			}
	});
});
