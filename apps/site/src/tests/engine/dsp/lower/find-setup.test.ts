/**
 * `findSetup` finds the `defmod` call whose last argument's text equals the
 * setup's `toString()` exactly, among any others in the same file.
 */

import { describe, expect, it } from "vitest";

import { fileProgram } from "@/engine/dsp/lower/file-program";
import { findSetup } from "@/engine/dsp/lower/find-setup";
import type { SourceText } from "@/engine/dsp/source-text";

describe("findSetup", () => {
	it("finds the right defmod among two", () => {
		const text = [
			'defmod("a", {}, ({ sr }) => {',
			"  return (i) => i",
			"})",
			'defmod("b", {}, ({ sr }) => {',
			"  return (i) => i * 2",
			"})",
		].join("\n");
		const source: SourceText = { file: "patch", text };
		const program = fileProgram(source);

		const setupB = "({ sr }) => {\n  return (i) => i * 2\n}";
		const found = findSetup(program, text, setupB);

		expect(found).not.toBeNull();
		expect(text.slice(found!.call.start, found!.call.start + 11)).toBe('defmod("b",');
	});

	it("returns null for no match", () => {
		const text = 'defmod("a", {}, ({ sr }) => {\n  return (i) => i\n})';
		const source: SourceText = { file: "patch", text };
		const program = fileProgram(source);

		const found = findSetup(program, text, "({ sr }) => { return (i) => i * 99 }");
		expect(found).toBeNull();
	});
});
