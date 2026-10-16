/**
 * `stateText` builds the internal state function: config destructure, the
 * setup's own statements (minus its final `return (tick) => ...`), any
 * same-file helper those statements call, and a final `return { fields }`
 * naming the setup locals the tick references.
 */

import { describe, expect, it } from "vitest";

import { fileProgram } from "@/core3/module/lower/file-program";
import { fileScope } from "@/core3/module/lower/file-scope";
import { findSetup } from "@/core3/module/lower/find-setup";
import { setupParts } from "@/core3/module/lower/setup-parts";
import { stateText } from "@/core3/module/lower/state-text";
import type { SourceText } from "@/core3/module/source-text";

function lowerSetup(fileText: string, setupText: string) {
	const source: SourceText = { file: "patch", text: fileText };
	const program = fileProgram(source);
	const found = findSetup(program, fileText, setupText);
	if (found === null) throw new Error("test setup: findSetup found nothing");
	return { parts: setupParts(found.setup, "module 'echo'"), program };
}

describe("stateText", () => {
	it("the echo example: config destructure, setup statements, return { buf, w }", () => {
		const fileText = [
			'defmod("echo", {}, ({ sr, taps = 3 }) => {',
			"  const buf = new Float64Array(sr)",
			"  let w = 0",
			"  return ({ in: x = 0 }) => {",
			"    const y = x + buf[w]",
			"    buf[w] = y; w = (w + 1) % buf.length",
			"    return y",
			"  }",
			"})",
		].join("\n");
		const setupText = [
			"({ sr, taps = 3 }) => {",
			"  const buf = new Float64Array(sr)",
			"  let w = 0",
			"  return ({ in: x = 0 }) => {",
			"    const y = x + buf[w]",
			"    buf[w] = y; w = (w + 1) % buf.length",
			"    return y",
			"  }",
			"}",
		].join("\n");
		const { parts, program } = lowerSetup(fileText, setupText);
		const scope = fileScope(program);

		const result = stateText(
			parts.statements,
			fileText,
			parts.params.config,
			new Set(["buf", "w"]),
			parts.locals,
			scope,
		);

		expect(result.fields).toEqual(["buf", "w"]);
		expect(result.text).toContain("const { taps = 3 } = cfg");
		expect(result.text).toContain("const buf = new Float64Array(sr)");
		expect(result.text).toContain("let w = 0");
		expect(result.text).toContain("return { buf, w };");

		const state = new Function("return " + result.text)()(48000, {});
		expect(state.buf.length).toBe(48000);
		expect(state.w).toBe(0);
	});

	it("a setup calling a file helper includes its declaration", () => {
		const fileText = [
			"function initial(sr) { return sr / 2 }",
			'defmod("half", {}, ({ sr }) => {',
			"  const half = initial(sr)",
			"  return ({ in: x = 0 }) => {",
			"    return x + half",
			"  }",
			"})",
		].join("\n");
		const setupText = [
			"({ sr }) => {",
			"  const half = initial(sr)",
			"  return ({ in: x = 0 }) => {",
			"    return x + half",
			"  }",
			"}",
		].join("\n");
		const { parts, program } = lowerSetup(fileText, setupText);
		const scope = fileScope(program);

		const result = stateText(parts.statements, fileText, parts.params.config, new Set(["half"]), parts.locals, scope);

		expect(result.text).toContain("function initial(sr) { return sr / 2 }");
		const state = new Function("return " + result.text)()(48000, {});
		expect(state.half).toBe(24000);
	});
});
