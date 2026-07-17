import { describe, expect, it } from "vitest";

import { mix } from "@/core3/modules/mix";
import { reduceDriver } from "./helpers";

/** Build a lane array. */
const lanes = (...v: number[]) => Float32Array.from(v);

describe("mix", () => {
	it("sums lanes scaled by 1/√width", () => {
		const d = reduceDriver(mix, 4);
		const out = d.step({ in: lanes(1, 1, 1, 1) }).out;
		expect(out).toBeCloseTo(4 / Math.sqrt(4), 6); // = 2
	});

	it("normalization constant is width-only, independent of zero-crossings", () => {
		// A lane momentarily at 0 must NOT change the scale factor.
		const d1 = reduceDriver(mix, 3);
		const withZero = d1.step({ in: lanes(1, 0, 1) }).out;
		const d2 = reduceDriver(mix, 3);
		const noZero = d2.step({ in: lanes(1, 1, 1) }).out;
		// both divide by √3 regardless
		expect(withZero).toBeCloseTo(2 / Math.sqrt(3), 6);
		expect(noZero).toBeCloseTo(3 / Math.sqrt(3), 6);
	});

	it("width 1 passes through unchanged", () => {
		const d = reduceDriver(mix, 1);
		expect(d.step({ in: lanes(0.42) }).out).toBeCloseTo(0.42, 6);
	});

	it("broadcast scalar input treated as a single lane sum", () => {
		const d = reduceDriver(mix, 1);
		expect(d.step({ in: 0.7 }).out).toBeCloseTo(0.7, 6);
	});
});
