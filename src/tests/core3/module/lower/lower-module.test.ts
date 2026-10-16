/**
 * `lowerModule` end to end: the echo example (MANIFESTO §5, the card's
 * shape-C sample) lowers to a `LoweredModule` whose ports, writes and
 * origins match the written text, and whose `source` is a valid
 * `ModuleSource` shape.
 *
 * The reserved-name checks now run at the author boundary (assert-author-names.ts),
 * not on every rewrite, so `bindSource` accepts the lowered echo's `__dsp_`-prefixed
 * internal text.
 */

import { describe, expect, it } from "vitest";

import { bindSource } from "@/core3/module/bind-module";
import { fileProgram } from "@/core3/module/lower/file-program";
import { lowerModule } from "@/core3/module/lower/lower-module";
import type { SourceText } from "@/core3/module/source-text";

const FILE_TEXT = [
	"function wrapIndex(k, n) { return ((Math.floor(k) % n) + n) % n }",
	"",
	'defmod("echo", { cat: "effects" }, ({ sr }) => {',
	"  const buf = new Float64Array(sr)",
	"  let w = 0",
	"  return ({ in: x = 0, time = secs(0.25) }) => {",
	"    const y = x + buf[wrapIndex(w - time * sr, buf.length)] * 0.5",
	"    buf[w] = y; w = (w + 1) % buf.length",
	"    return y",
	"  }",
	"})",
].join("\n");

const SETUP_TEXT = [
	"({ sr }) => {",
	"  const buf = new Float64Array(sr)",
	"  let w = 0",
	"  return ({ in: x = 0, time = secs(0.25) }) => {",
	"    const y = x + buf[wrapIndex(w - time * sr, buf.length)] * 0.5",
	"    buf[w] = y; w = (w + 1) % buf.length",
	"    return y",
	"  }",
	"}",
].join("\n");

function lowerEcho() {
	const source: SourceText = { file: "patch", text: FILE_TEXT };
	const program = fileProgram(source);
	return lowerModule({
		name: "echo",
		meta: { cat: "effects" },
		setupText: SETUP_TEXT,
		file: { text: FILE_TEXT, program },
		library: false,
	});
}

describe("lowerModule", () => {
	it("the echo example end to end", () => {
		const lowered = lowerEcho();

		expect(Object.keys(lowered.ins)).toEqual(["in", "time"]);
		expect(Object.keys(lowered.outs)).toEqual(["out"]);
		expect(lowered.defaultIn).toBe("in");
		expect(lowered.positional).toEqual(["in", "time"]);
		expect([...lowered.writes].sort()).toEqual(["buf", "w"]);

		// `defmod(` is at line 3; the tick arrow it returns starts at line 6.
		expect(lowered.source.origins?.tick).toEqual({ file: "patch", line: 6 });
		expect(lowered.source.helpers.wrapIndex).toBeDefined();
	});

	const argsSetupText = [
		"({ sr }) => {",
		"  return ({ in: p = 0, a = 1, b = 2 }) => p + a + b",
		"}",
	].join("\n");

	it("meta.args sets the positional order after the default input", () => {
		const fileText = [`defmod("x", { args: ["b"] }, ${argsSetupText})`].join("\n");
		const source: SourceText = { file: "patch", text: fileText };
		const lowered = lowerModule({
			name: "x",
			meta: { args: ["b"] },
			setupText: argsSetupText,
			file: { text: fileText, program: fileProgram(source) },
			library: false,
		});
		expect(lowered.defaultIn).toBe("in");
		expect(lowered.positional).toEqual(["in", "b"]);
	});

	it("meta.args naming the default input is a loud error", () => {
		const fileText = [`defmod("x", { args: ["in"] }, ${argsSetupText})`].join("\n");
		const source: SourceText = { file: "patch", text: fileText };
		expect(() =>
			lowerModule({
				name: "x",
				meta: { args: ["in"] },
				setupText: argsSetupText,
				file: { text: fileText, program: fileProgram(source) },
				library: false,
			}),
		).toThrow(/default input/);
	});

	it("a tick calling a library helper lowers without error, and the helper appears in source.helpers", () => {
		const setupText = ["({ sr }) => {", "  return ({ in: p = 0 }) => semisToHz(p)", "}"].join("\n");
		const fileText = [`defmod("x", {}, ${setupText})`].join("\n");
		const source: SourceText = { file: "patch", text: fileText };
		const lowered = lowerModule({
			name: "x",
			meta: {},
			setupText,
			file: { text: fileText, program: fileProgram(source) },
			library: false,
		});
		expect(lowered.source.helpers.semisToHz).toBeDefined();
	});

	it("feeding `source` into bindSource: the lowered echo is accepted", () => {
		const lowered = lowerEcho();
		const spec = {
			name: lowered.name,
			category: lowered.category,
			ins: lowered.ins,
			outs: lowered.outs,
			defaultIn: lowered.defaultIn as string,
			...(lowered.defaultOut !== undefined ? { defaultOut: lowered.defaultOut } : {}),
			positional: lowered.positional ?? [],
			config: lowered.config ?? {},
			tick: (() => {}) as never,
		};

		expect(() => bindSource(spec, lowered.source, "first use")).not.toThrow();
	});
});
