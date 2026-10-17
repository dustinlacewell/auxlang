import { describe, expect, it } from "vitest";

import { formatPortDefault } from "@/ui/docs-kit/format-port-default";

describe("formatPortDefault", () => {
	it("a plain default renders bare", () => {
		expect(formatPortDefault({ unit: "sig", def: 0.5 })).toBe("0.5");
	});

	it("a ranged default renders the range after it", () => {
		expect(formatPortDefault({ unit: "sig", def: 0.5, range: { min: 0, max: 1 } })).toBe("0.5 (0–1)");
	});

	it("a ranged unit-tagged default keeps the raw number (no unit suffix)", () => {
		expect(formatPortDefault({ unit: "secs", def: 0.25, range: { min: 0.01, max: 1 } })).toBe(
			"0.25 (0.01–1)",
		);
	});

	it("an optional unconnected default (def: null) renders a dash", () => {
		expect(formatPortDefault({ unit: "sig", def: null, opt: true })).toBe("—");
	});
});
