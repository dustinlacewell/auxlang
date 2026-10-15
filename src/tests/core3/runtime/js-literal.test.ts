/**
 * The numeric literal spellings the generator bakes into driver source.
 */

import { numLiteral } from "@/core3/runtime/codegen/js-literal";
import { describe, expect, it } from "vitest";

describe("numLiteral", () => {
	it("round-trips every double, including -0, NaN, and infinities", () => {
		const edges = [
			0,
			-0,
			0.1,
			1 / 3,
			-1e-300,
			5e-324,
			Number.NaN,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		];
		for (const v of edges) {
			expect(Object.is(new Function(`return ${numLiteral(v)};`)(), v)).toBe(true);
		}
	});

	it("refuses a non-number", () => {
		expect(() => numLiteral("1")).toThrow("numeric constant");
	});
});
