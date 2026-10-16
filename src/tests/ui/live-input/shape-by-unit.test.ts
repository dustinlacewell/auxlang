import { shapeByUnit } from "@/ui/core3-editor/live-input/shape-by-unit";
import { describe, expect, it } from "vitest";

describe("shapeByUnit", () => {
	it("clamps a 0..1 unit port at both ends", () => {
		expect(shapeByUnit(0.9, 5, "unit")).toBe(1);
		expect(shapeByUnit(0.1, -5, "unit")).toBe(0);
		expect(shapeByUnit(0.5, 0.1, "unit")).toBeCloseTo(0.6);
	});

	it("snaps a gate to 0 or 1", () => {
		expect(shapeByUnit(0, 1, "gate")).toBe(1);
		expect(shapeByUnit(1, -1, "gate")).toBe(0);
	});

	it("steps semitones by exactly 1 per step", () => {
		expect(shapeByUnit(60, 1, "semis")).toBe(61);
		expect(shapeByUnit(60, -1, "semis")).toBe(59);
	});

	it("moves secs and hz by a percentage and never crosses 0", () => {
		const up = shapeByUnit(100, 1, "hz");
		expect(up).toBeGreaterThan(100);
		const down = shapeByUnit(100, -1000, "secs");
		expect(down).toBeGreaterThan(0);
	});
});
