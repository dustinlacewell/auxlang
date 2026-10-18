/**
 * Helper param defaults (card step 11): a helper's own `= default` is read
 * off its declaration, validated (constant, or an earlier param), and
 * applied at call sites that omit the arg — never on a value that happens
 * to be `undefined` at run time.
 */

import { describe, expect, it } from "vitest";

import { applyHelperParamDefaults, helperParamDefaults } from "@/dsp/lower/helper-param-defaults";
import { fileScope } from "@/dsp/lower/file-scope";
import { fileProgram } from "@/dsp/lower/file-program";
import type { SourceText } from "@/dsp/source-text";

function scopeOf(fileText: string) {
	const source: SourceText = { file: "patch", text: fileText };
	return fileScope(fileProgram(source));
}

describe("helperParamDefaults", () => {
	it("a default that is a literal validates", () => {
		const fileText = "function f(x, k = 0.5) { return x * k }";
		const defaults = helperParamDefaults(["f"], scopeOf(fileText), fileText, "test");
		expect(defaults.get("f")).toEqual([null, "0.5"]);
	});

	it("a default referencing an earlier param validates", () => {
		const fileText = "function f(x, k = x) { return x * k }";
		const defaults = helperParamDefaults(["f"], scopeOf(fileText), fileText, "test");
		expect(defaults.get("f")).toEqual([null, "x"]);
	});

	it("a default calling a function is a loud error", () => {
		const fileText = "function f(x, k = Math.random()) { return x * k }";
		expect(() => helperParamDefaults(["f"], scopeOf(fileText), fileText, "test")).toThrow(
			/calls a function/,
		);
	});

	it("a default referencing a later param is a loud error", () => {
		const fileText = "function f(k = j, j) { return k + j }";
		expect(() => helperParamDefaults(["f"], scopeOf(fileText), fileText, "test")).toThrow(
			/not a constant or an earlier param/,
		);
	});
});

describe("applyHelperParamDefaults", () => {
	it("a call omitting the defaulted trailing arg gets it inserted", () => {
		const fileText = "function f(x, k = 0.5) { return x * k }";
		const defaults = helperParamDefaults(["f"], scopeOf(fileText), fileText, "test");
		const caller = "(s, i, o) => { o.out = f(i.in) }";
		expect(applyHelperParamDefaults(caller, defaults, null)).toBe(
			"(s, i, o) => { o.out = f(i.in, 0.5) }",
		);
	});

	it("a call already giving the arg is left alone", () => {
		const fileText = "function f(x, k = 0.5) { return x * k }";
		const defaults = helperParamDefaults(["f"], scopeOf(fileText), fileText, "test");
		const caller = "(s, i, o) => { o.out = f(i.in, 2) }";
		expect(applyHelperParamDefaults(caller, defaults, null)).toBe(caller);
	});

	it("the helper's own param list loses its default when it is the stripped function", () => {
		const fileText = "function f(x, k = 0.5) { return x * k }";
		const defaults = helperParamDefaults(["f"], scopeOf(fileText), fileText, "test");
		expect(applyHelperParamDefaults(fileText, defaults, "f")).toBe(
			"function f(x, k) { return x * k }",
		);
	});

	it("one helper calling another with an omitted arg is completed the same way", () => {
		const fileText = "function env(x, k = 0.5) { return x * k }\nfunction g(x) { return env(x) }";
		const defaults = helperParamDefaults(["env"], scopeOf(fileText), fileText, "test");
		const gText = "function g(x) { return env(x) }";
		expect(applyHelperParamDefaults(gText, defaults, null)).toBe(
			"function g(x) { return env(x, 0.5) }",
		);
	});

	it("text with no call to a defaulted helper is returned unchanged", () => {
		const fileText = "function f(x, k = 0.5) { return x * k }";
		const defaults = helperParamDefaults(["f"], scopeOf(fileText), fileText, "test");
		const caller = "(s, i, o) => { o.out = i.in * 2 }";
		expect(applyHelperParamDefaults(caller, defaults, null)).toBe(caller);
	});
});
