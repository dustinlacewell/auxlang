import { knobAngle, valueFraction, xyPuckPosition } from "@/ui/core3-editor/live-input/render-control";
import { describe, expect, it } from "vitest";

describe("valueFraction", () => {
	it("maps min to 0, max to 1, and between linearly", () => {
		expect(valueFraction(60, 60, 110)).toBe(0);
		expect(valueFraction(110, 60, 110)).toBe(1);
		expect(valueFraction(84, 60, 110)).toBeCloseTo(0.48);
	});

	it("clamps outside the range; an empty range is 0", () => {
		expect(valueFraction(-5, 0, 1)).toBe(0);
		expect(valueFraction(5, 0, 1)).toBe(1);
		expect(valueFraction(3, 2, 2)).toBe(0);
	});
});

describe("knobAngle", () => {
	it("min maps to -135deg, max to +135deg", () => {
		expect(knobAngle(0, 0, 1)).toBeCloseTo(-135);
		expect(knobAngle(1, 0, 1)).toBeCloseTo(135);
	});

	it("the midpoint maps to 0deg", () => {
		expect(knobAngle(0.5, 0, 1)).toBeCloseTo(0);
	});

	it("scales with an arbitrary range", () => {
		expect(knobAngle(60, 0, 120)).toBeCloseTo(0);
		expect(knobAngle(90, 0, 120)).toBeCloseTo(67.5);
	});

	it("clamps a value outside the range", () => {
		expect(knobAngle(-1, 0, 1)).toBeCloseTo(-135);
		expect(knobAngle(2, 0, 1)).toBeCloseTo(135);
	});
});

describe("xyPuckPosition", () => {
	const unit = { min: 0, max: 1 };

	it("places (min, min) at bottom-left", () => {
		expect(xyPuckPosition(0, 0, unit, unit)).toEqual({ left: 0, top: 1 });
	});

	it("places (max, max) at top-right (y up)", () => {
		expect(xyPuckPosition(1, 1, unit, unit)).toEqual({ left: 1, top: 0 });
	});

	it("places the midpoint at the pad's center", () => {
		expect(xyPuckPosition(0.5, 0.5, unit, unit)).toEqual({ left: 0.5, top: 0.5 });
	});

	it("clamps outside its range", () => {
		expect(xyPuckPosition(-1, 2, unit, unit)).toEqual({ left: 0, top: 0 });
	});
});
