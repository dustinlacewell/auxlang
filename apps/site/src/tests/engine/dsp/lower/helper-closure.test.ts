/**
 * `helperClosure` follows the tick's call graph through same-file helpers,
 * transitively, and recognizes library function names; an unresolvable free
 * name throws, naming it.
 */

import { describe, expect, it } from "vitest";

import { fileProgram } from "@/engine/dsp/lower/file-program";
import { fileScope } from "@/engine/dsp/lower/file-scope";
import { findSetup } from "@/engine/dsp/lower/find-setup";
import { helperClosure } from "@/engine/dsp/lower/helper-closure";
import { setupParts } from "@/engine/dsp/lower/setup-parts";
import type { SourceText } from "@/engine/dsp/source-text";

function lowerTick(fileText: string, setupText: string, moduleName: string) {
	const source: SourceText = { file: "patch", text: fileText };
	const program = fileProgram(source);
	const found = findSetup(program, fileText, setupText);
	if (found === null) throw new Error("test setup: findSetup found nothing");
	const parts = setupParts(found.setup, `module '${moduleName}'`);
	return { parts, scope: fileScope(program) };
}

describe("helperClosure", () => {
	it("a transitive same-file helper is found", () => {
		const fileText = [
			"function inner(n) { return n * 2 }",
			"function outer(n) { return inner(n) + 1 }",
			'defmod("m", {}, ({ sr }) => {',
			"  return ({ in: x = 0 }) => {",
			"    return outer(x)",
			"  }",
			"})",
		].join("\n");
		const setupText = ["({ sr }) => {", "  return ({ in: x = 0 }) => {", "    return outer(x)", "  }", "}"].join("\n");
		const { parts, scope } = lowerTick(fileText, setupText, "m");

		const closure = helperClosure(parts.tick, scope, new Set(["x"]), fileText, "m");

		expect([...closure.fileNames].sort()).toEqual(["inner", "outer"]);
		expect(closure.helpers.outer).toContain("inner(n)");
		expect(closure.helpers.inner).toContain("n * 2");
	});

	it("a library name is found", () => {
		const fileText = [
			'defmod("m", {}, ({ sr }) => {',
			"  return ({ cutoff = 84 }) => {",
			"    return semisToHz(cutoff)",
			"  }",
			"})",
		].join("\n");
		const setupText = ["({ sr }) => {", "  return ({ cutoff = 84 }) => {", "    return semisToHz(cutoff)", "  }", "}"].join(
			"\n",
		);
		const { parts, scope } = lowerTick(fileText, setupText, "m");

		const closure = helperClosure(parts.tick, scope, new Set(["cutoff"]), fileText, "m");

		expect(closure.helpers.semisToHz).toBeDefined();
		expect(closure.fileNames).toEqual([]);
	});

	it("an unknown free identifier throws, naming it", () => {
		const fileText = [
			'defmod("m", {}, ({ sr }) => {',
			"  return ({ in: x = 0 }) => {",
			"    return mystery(x)",
			"  }",
			"})",
		].join("\n");
		const setupText = ["({ sr }) => {", "  return ({ in: x = 0 }) => {", "    return mystery(x)", "  }", "}"].join("\n");
		const { parts, scope } = lowerTick(fileText, setupText, "m");

		expect(() => helperClosure(parts.tick, scope, new Set(["x"]), fileText, "m")).toThrow(/mystery/);
	});
});
