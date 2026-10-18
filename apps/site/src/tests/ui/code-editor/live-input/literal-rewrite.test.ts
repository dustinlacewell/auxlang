import { literalRewrite } from "@/ui/code-editor/live-input/literal-rewrite";
import { describe, expect, it } from "vitest";

describe("literalRewrite", () => {
	it("replaces the literal's range with the value in its original shape", () => {
		const doc = "saw(0.25).out()";
		const range = { start: 4, end: 8 }; // "0.25"
		expect(literalRewrite(doc, range, 0.35)).toEqual({ from: 4, to: 8, insert: "0.35" });
	});

	it("keeps integer shape for an integer literal", () => {
		const doc = "sin(440).out()";
		const range = { start: 4, end: 7 }; // "440"
		expect(literalRewrite(doc, range, 450)).toEqual({ from: 4, to: 7, insert: "450" });
	});
});
