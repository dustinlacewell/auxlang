import { describe, expect, it } from "vitest";

import { fixedRange, nextRange } from "@/live-display/scope-scale";

describe("nextRange", () => {
	it("grows at once to cover a wider signal", () => {
		const r = nextRange({ min: -0.5, max: 0.5 }, { min: -1, max: 2 }, null, 1 / 60);
		expect(r).toEqual({ min: -1, max: 2 });
	});

	it("shrinks toward a narrower signal slowly, not in one frame", () => {
		const r = nextRange({ min: -1, max: 1 }, { min: -0.1, max: 0.1 }, null, 1 / 60);
		expect(r.max).toBeLessThan(1);
		expect(r.max).toBeGreaterThan(0.9);
		expect(r.min).toBeGreaterThan(-1);
		expect(r.min).toBeLessThan(-0.9);
	});

	it("a fixed range wins", () => {
		const fixed = { min: -2, max: 2 };
		expect(nextRange({ min: 0, max: 1 }, { min: -9, max: 9 }, fixed, 1)).toBe(fixed);
	});

	it("a flat first frame sits mid-height in a range 1 wide", () => {
		expect(nextRange(undefined, { min: 3, max: 3 }, null, 0)).toEqual({ min: 2.5, max: 3.5 });
	});
});

describe("fixedRange", () => {
	it("is null for the default equal min/max, a range when min < max", () => {
		expect(fixedRange({ min: 0, max: 0 })).toBeNull();
		expect(fixedRange({ min: -1, max: 1 })).toEqual({ min: -1, max: 1 });
	});
});
