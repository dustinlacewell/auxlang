/**
 * The WASM runtime functions give JS's exact answers: `%` (fmod), ToInt32,
 * Math.round and Math.sign, on the edge cases where a naive translation
 * differs (signed zeros, halves, huge values, NaN, the infinities).
 */

import { describe, expect, it } from "vitest";
import { exportFunctions } from "./function-module";

const VALUES = [
	0,
	-0,
	0.5,
	-0.5,
	1.5,
	2.5,
	-2.5,
	0.49999999999999994,
	-0.49999999999999994,
	1 / 3,
	-7.25,
	123456.789,
	2 ** 31,
	-(2 ** 31),
	2 ** 31 - 0.5,
	-(2 ** 31) - 0.5,
	2 ** 32 + 5,
	-(2 ** 32) - 5,
	2 ** 53 + 2,
	2 ** 70 + 12345 * 2 ** 18,
	1e300,
	-1e300,
	5e-324,
	-5e-324,
	Number.NaN,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
];

const DIVISORS = [
	1,
	-1,
	0.3,
	3,
	2.5,
	1e-300,
	1e300,
	5e-324,
	0,
	-0,
	Number.NaN,
	Number.POSITIVE_INFINITY,
];

const wasm = exportFunctions((calls) => ({
	fmod: calls.runtime("fmod"),
	toInt32: calls.runtime("toInt32"),
	round: calls.runtime("round"),
	sign: calls.runtime("sign"),
}));

describe("WASM runtime functions", () => {
	it("fmod is JS %", () => {
		for (const x of VALUES)
			for (const y of DIVISORS)
				expect(Object.is(wasm.fmod?.(x, y), x % y), `${x} % ${y}`).toBe(true);
	});

	it("toInt32 is x | 0", () => {
		for (const x of VALUES) expect(wasm.toInt32?.(x), `${x}`).toBe(x | 0);
	});

	it("round is Math.round, sign is Math.sign", () => {
		for (const x of VALUES) {
			expect(Object.is(wasm.round?.(x), Math.round(x)), `round ${x}`).toBe(true);
			expect(Object.is(wasm.sign?.(x), Math.sign(x)), `sign ${x}`).toBe(true);
		}
	});
});
