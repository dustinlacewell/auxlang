import { describe, expect, it } from "vitest";

import { shapeFits } from "@/engine/module/front/state/shape-fits";
import { laneShapeOf } from "@/engine/module/front/state/state-shape-of";

/** Two lane states fit as both carries see them. */
function fits(carried: Record<string, unknown>, fresh: Record<string, unknown>): boolean {
	return shapeFits(laneShapeOf(carried), laneShapeOf(fresh));
}

describe("shapeFits", () => {
	const fresh = () => ({ n: 0, buf: new Float32Array(4), nested: { k: 0 }, list: [0] });

	it("fits the same keys, value kinds, and lengths", () => {
		expect(fits({ ...fresh(), n: 7, __lane: 2, __rng: 9 }, { ...fresh(), __rng: 1 })).toBe(true);
	});

	it("ignores the engine's scratch on either side", () => {
		expect(fits({ ...fresh(), __scratch: { table: 1 } }, { ...fresh(), __scratch: {} })).toBe(true);
		expect(fits(fresh(), { ...fresh(), __scratch: {} })).toBe(true);
	});

	it("does not fit a changed array or typed-array length", () => {
		expect(fits({ ...fresh(), buf: new Float32Array(9) }, fresh())).toBe(false);
		expect(fits({ ...fresh(), list: [1, 2] }, fresh())).toBe(false);
	});

	it("compares array items by shape", () => {
		expect(fits({ ...fresh(), list: [5] }, fresh())).toBe(true);
		expect(fits({ ...fresh(), list: ["x"] }, fresh())).toBe(false);
	});

	it("does not fit a missing or extra key", () => {
		const { n: _n, ...missing } = fresh();
		expect(fits(missing, fresh())).toBe(false);
		expect(fits({ ...fresh(), extra: 0 }, fresh())).toBe(false);
	});

	it("does not fit a changed value kind", () => {
		expect(fits({ ...fresh(), buf: new Float64Array(4) }, fresh())).toBe(false);
		expect(fits({ ...fresh(), n: [0] }, fresh())).toBe(false);
		expect(fits({ ...fresh(), nested: { k: "x" } }, fresh())).toBe(false);
		expect(fits({ ...fresh(), list: new Float32Array(1) }, fresh())).toBe(false);
	});

	it("fits arrays of records item by item, key order aside", () => {
		const records = [
			{ a: 0, b: 0 },
			{ a: 0, b: 0 },
		];
		const reordered = [
			{ a: 0, b: 0 },
			{ b: 0, a: 0 },
		];
		expect(fits({ records }, { records: reordered })).toBe(true);
		expect(fits({ records: reordered }, { records })).toBe(true);
		expect(fits({ records: [{ a: 0 }, { a: 0 }] }, { records })).toBe(false);
	});

	it("ignores the engine's field names inside a record too", () => {
		expect(fits({ r: { a: 0, __seed: 1 } }, { r: { a: 0 } })).toBe(true);
	});
});
