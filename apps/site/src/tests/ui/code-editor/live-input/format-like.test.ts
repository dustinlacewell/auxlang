import { formatLike } from "@/ui/code-editor/live-input/format-like";
import { describe, expect, it } from "vitest";

describe("formatLike", () => {
	it("keeps the original's decimal places", () => {
		expect(formatLike(0.35, "0.25")).toBe("0.35");
	});

	it("writes an integer with no decimal point", () => {
		expect(formatLike(440, "440")).toBe("440");
	});

	it("never produces floating point noise", () => {
		const value = 0.1 + 0.2;
		expect(formatLike(value, "0.25")).not.toMatch(/e|0{5,}/);
	});
});
