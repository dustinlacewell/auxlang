import { stepFromDigit } from "@/ui/core3-editor/live-input/step-from-digit";
import { describe, expect, it } from "vitest";

describe("stepFromDigit", () => {
	it("steps an integer literal by the caret digit's place value", () => {
		expect(stepFromDigit("440", 0)).toBe(100);
		expect(stepFromDigit("440", 1)).toBe(10);
		expect(stepFromDigit("440", 2)).toBe(1);
	});

	it("steps a decimal literal's fractional digits", () => {
		expect(stepFromDigit("0.25", 2)).toBeCloseTo(0.1);
		expect(stepFromDigit("0.25", 3)).toBeCloseTo(0.01);
	});

	it("includes the sign in a negative literal's digit positions", () => {
		expect(stepFromDigit("-3.5", 1)).toBe(1);
		expect(stepFromDigit("-3.5", 3)).toBeCloseTo(0.1);
	});

	it("divides the step by 10 when fine is set", () => {
		expect(stepFromDigit("440", 1, true)).toBe(1);
		expect(stepFromDigit("0.25", 2, true)).toBeCloseTo(0.01);
	});
});
