import { describe, expect, it } from "vitest";

import { stateFits } from "@/core3/runtime/state-fits";

describe("stateFits", () => {
	const fresh = () => ({ n: 0, buf: new Float32Array(4), nested: { k: 0 }, list: [0] });

	it("fits the same keys, value kinds, and lengths", () => {
		expect(stateFits({ ...fresh(), n: 7, __lane: 2, __rng: 9 }, { ...fresh(), __rng: 1 })).toBe(
			true,
		);
	});

	it("ignores the engine's scratch on either side", () => {
		expect(stateFits({ ...fresh(), __scratch: { table: 1 } }, { ...fresh(), __scratch: {} })).toBe(
			true,
		);
		expect(stateFits(fresh(), { ...fresh(), __scratch: {} })).toBe(true);
	});

	it("does not fit a changed array or typed-array length", () => {
		expect(stateFits({ ...fresh(), buf: new Float32Array(9) }, fresh())).toBe(false);
		expect(stateFits({ ...fresh(), list: [1, 2] }, fresh())).toBe(false);
	});

	it("compares array items by shape", () => {
		expect(stateFits({ ...fresh(), list: [5] }, fresh())).toBe(true);
		expect(stateFits({ ...fresh(), list: ["x"] }, fresh())).toBe(false);
	});

	it("does not fit a missing or extra key", () => {
		const { n: _n, ...missing } = fresh();
		expect(stateFits(missing, fresh())).toBe(false);
		expect(stateFits({ ...fresh(), extra: 0 }, fresh())).toBe(false);
	});

	it("does not fit a changed value kind", () => {
		expect(stateFits({ ...fresh(), buf: new Float64Array(4) }, fresh())).toBe(false);
		expect(stateFits({ ...fresh(), n: [0] }, fresh())).toBe(false);
		expect(stateFits({ ...fresh(), nested: { k: "x" } }, fresh())).toBe(false);
		expect(stateFits({ ...fresh(), list: new Float32Array(1) }, fresh())).toBe(false);
	});
});
