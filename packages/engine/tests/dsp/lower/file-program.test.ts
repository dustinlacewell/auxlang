/**
 * `fileProgram` parses a `SourceText`'s whole text once and caches by the
 * `SourceText` object; a patch body may `return`, as a function body can.
 */

import { describe, expect, it } from "vitest";

import { fileProgram } from "@/dsp/lower/file-program";
import type { SourceText } from "@/dsp/source-text";

describe("fileProgram", () => {
	it("returns the same Program object for the same SourceText", () => {
		const source: SourceText = { file: "patch", text: "const x = 1" };
		expect(fileProgram(source)).toBe(fileProgram(source));
	});

	it("parses a top-level return, as a patch body allows", () => {
		const source: SourceText = { file: "patch", text: "return 1" };
		const program = fileProgram(source);
		expect(program.body[0]?.type).toBe("ReturnStatement");
	});
});
