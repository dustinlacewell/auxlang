/**
 * `fileScope` reads a file's top-level `function` declarations and numeric
 * `const` bindings; nothing else is file scope.
 */

import { describe, expect, it } from "vitest";

import { fileProgram } from "@/dsp/lower/file-program";
import { fileScope } from "@/dsp/lower/file-scope";
import type { SourceText } from "@/dsp/source-text";

describe("fileScope", () => {
	it("picks up top-level functions and numeric consts, including negative", () => {
		const text = [
			"function helper(x) { return x }",
			"const DEPTH = 0.5",
			"const NEG = -2",
			"function other() {",
			"  function nested() {}",
			"  return nested",
			"}",
		].join("\n");
		const source: SourceText = { file: "patch", text };
		const scope = fileScope(fileProgram(source));

		expect([...scope.functions.keys()].sort()).toEqual(["helper", "other"]);
		expect(scope.consts.get("DEPTH")?.value).toBe(0.5);
		expect(scope.consts.get("NEG")?.value).toBe(-2);
		expect(scope.functions.has("nested")).toBe(false);
	});

	it("ignores let and non-literal consts", () => {
		const text = ["let w = 0", "const buf = new Float64Array(8)", "const taps = 1 + 2"].join("\n");
		const source: SourceText = { file: "patch", text };
		const scope = fileScope(fileProgram(source));

		expect(scope.consts.size).toBe(0);
		expect(scope.functions.size).toBe(0);
	});
});
