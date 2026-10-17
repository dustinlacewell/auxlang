import { describe, expect, it } from "vitest";

import { draggedSlotValue } from "@/ui/code-editor/live-input/dragged-slot-value";

describe("draggedSlotValue", () => {
	it("no decl -> plain additive sig shaping, no clamp", () => {
		expect(draggedSlotValue(0.5, 3, undefined)).toBe(3.5);
	});

	it("a decl with no unit or range -> plain additive sig shaping", () => {
		expect(draggedSlotValue(0.5, 3, { site: 0, init: 0.5 })).toBe(3.5);
	});

	it("a decl's unit shapes the delta (semis moves exactly 1 per step)", () => {
		expect(draggedSlotValue(60, 2, { site: 0, init: 60, unit: "semis" })).toBe(62);
	});

	it("a decl's range clamps the result at both ends", () => {
		expect(draggedSlotValue(0.9, 5, { site: 0, init: 0.9, min: 0, max: 1 })).toBe(1);
		expect(draggedSlotValue(0.1, -5, { site: 0, init: 0.1, min: 0, max: 1 })).toBe(0);
	});

	it("within range, the shaped value passes through unclamped", () => {
		expect(draggedSlotValue(0.5, 0.2, { site: 0, init: 0.5, min: 0, max: 1 })).toBeCloseTo(0.7);
	});
});
