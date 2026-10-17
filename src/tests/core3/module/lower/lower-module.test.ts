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

	it("meta.args sets the complete positional order; absent args, the default input leads", () => {
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
		expect(lowered.positional).toEqual(["b"]);
	});

	it("meta.args naming the default input is allowed, at any slot (not necessarily first)", () => {
		const fileText = [`defmod("x", { args: ["a", "in", "b"] }, ${argsSetupText})`].join("\n");
		const source: SourceText = { file: "patch", text: fileText };
		const lowered = lowerModule({
			name: "x",
			meta: { args: ["a", "in", "b"] },
			setupText: argsSetupText,
			file: { text: fileText, program: fileProgram(source) },
			library: false,
		});
		expect(lowered.positional).toEqual(["a", "in", "b"]);
	});

	it("meta.args: [] — no input is positional; every input is settable by name only", () => {
		const fileText = [`defmod("x", { args: [] }, ${argsSetupText})`].join("\n");
		const source: SourceText = { file: "patch", text: fileText };
		const lowered = lowerModule({
			name: "x",
			meta: { args: [] },
			setupText: argsSetupText,
			file: { text: fileText, program: fileProgram(source) },
			library: false,
		});
		expect(lowered.positional).toEqual([]);
	});

	it("meta.args omitting the default input: it is settable by name only, like any other omitted port", () => {
		const fileText = [`defmod("x", { args: ["a"] }, ${argsSetupText})`].join("\n");
		const source: SourceText = { file: "patch", text: fileText };
		const lowered = lowerModule({
			name: "x",
			meta: { args: ["a"] },
			setupText: argsSetupText,
			file: { text: fileText, program: fileProgram(source) },
			library: false,
		});
		expect(lowered.positional).toEqual(["a"]);
	});

	const argsWithConfigSetupText = [
		"({ sr, mul = 2 }) => {",
		"  return ({ in: p = 0 }) => p * mul",
		"}",
	].join("\n");

	it("meta.args may name a setup config param (not just an input): omitting the default input makes it name-only", () => {
		const fileText = [`defmod("x", { args: ["mul"] }, ${argsWithConfigSetupText})`].join("\n");
		const source: SourceText = { file: "patch", text: fileText };
		const lowered = lowerModule({
			name: "x",
			meta: { args: ["mul"] },
			setupText: argsWithConfigSetupText,
			file: { text: fileText, program: fileProgram(source) },
			library: false,
		});
		expect(lowered.positional).toEqual(["mul"]);
		expect(lowered.config).toEqual({ mul: 2 });
	});

	it("meta.args crossing config and port, with the default input not first (seq-style: a config key before the port)", () => {
		const fileText = [`defmod("x", { args: ["mul", "in"] }, ${argsWithConfigSetupText})`].join("\n");
		const source: SourceText = { file: "patch", text: fileText };
		const lowered = lowerModule({
			name: "x",
			meta: { args: ["mul", "in"] },
			setupText: argsWithConfigSetupText,
			file: { text: fileText, program: fileProgram(source) },
			library: false,
		});
		expect(lowered.defaultIn).toBe("in");
		expect(lowered.positional).toEqual(["mul", "in"]);
	});

	it("meta.args naming an unknown name (not an input or a config key) is a loud error", () => {
		const fileText = [`defmod("x", { args: ["nope"] }, ${argsSetupText})`].join("\n");
		const source: SourceText = { file: "patch", text: fileText };
		expect(() =>
			lowerModule({
				name: "x",
				meta: { args: ["nope"] },
				setupText: argsSetupText,
				file: { text: fileText, program: fileProgram(source) },
				library: false,
			}),
		).toThrow(/'nope', which is not an input or a config key/);
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

	it("a helper's param default is lifted to the call site, stripped from its own param list", () => {
		const setupText = ["({ sr }) => {", "  return ({ in: x = 0 }) => env(x)", "}"].join("\n");
		const fileText = ["function env(x, k = 0.5) { return x * k }", "", `defmod("x", {}, ${setupText})`].join(
			"\n",
		);
		const source: SourceText = { file: "patch", text: fileText };
		const lowered = lowerModule({
			name: "x",
			meta: {},
			setupText,
			file: { text: fileText, program: fileProgram(source) },
			library: false,
		});
		expect(lowered.source.helpers.env).toBe("function env(x, k) { return x * k }");
		expect(lowered.source.tick).toContain("env(__dsp_i.in, 0.5)");
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

	const groupSetupText = [
		"({ sr }) => {",
		"  return ({ in: x = 0 }, o) => {",
		"    for (let k = 0; k < o.fields.length; k++) o.fields[k] = x + k",
		"    return x",
		"  }",
		"}",
	].join("\n");

	function lowerGroupModule(outs: Record<string, unknown>) {
		const fileText = [`defmod("x", { outs: ${JSON.stringify(outs)} }, ${groupSetupText})`].join("\n");
		const source: SourceText = { file: "patch", text: fileText };
		return lowerModule({
			name: "x",
			meta: { outs: outs as never },
			setupText: groupSetupText,
			file: { text: fileText, program: fileProgram(source) },
			library: false,
		});
	}

	it("a meta.outs key that is a group and never returned is exposed as a second output", () => {
		const lowered = lowerGroupModule({ fields: { unit: "sig", def: 0, group: { open: true } } });
		expect(Object.keys(lowered.outs)).toEqual(["out", "fields"]);
	});

	it("a meta.outs key that is not a group and never returned is a loud error", () => {
		expect(() => lowerGroupModule({ missing: { unit: "sig", def: 0 } })).toThrow(
			/'missing' is declared in meta\.outs but never returned/,
		);
	});

	it("writing 'o.<name>' where <name> is not a declared group is a loud error", () => {
		expect(() => lowerGroupModule({})).toThrow(/'fields' is not declared as a group output/);
	});

	it("a returned key that meta.outs declares as a group is a loud error", () => {
		const setupText = ["({ sr }) => {", "  return () => 0", "}"].join("\n");
		const fileText = [`defmod("x", { outs: { out: {} } }, ${setupText})`].join("\n");
		const source: SourceText = { file: "patch", text: fileText };
		expect(() =>
			lowerModule({
				name: "x",
				meta: { outs: { out: { unit: "sig", def: 0, group: { open: true } } } },
				setupText,
				file: { text: fileText, program: fileProgram(source) },
				library: false,
			}),
		).toThrow(/'out' is returned, but meta\.outs declares it as a group/);
	});

	it("end to end: a shape-C module returning 'out' and writing an open 'fields' group exposes both outputs", () => {
		const lowered = lowerGroupModule({ fields: { unit: "sig", def: 0, group: { open: true } } });
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
		const bound = bindSource(spec, lowered.source, "first use");

		// Drive the bound tick directly, placing the group view the way
		// `interpret-sample.ts`'s `fillGroupView`/`placeGroupView`/`drainGroupView` would.
		const fieldsView = new Float64Array(2); // two members fixed by this node's wiring
		const outs: Record<string, number> = { fields: fieldsView as unknown as number };
		(bound.tick as (s: unknown, i: unknown, o: unknown, c: unknown, sr: number) => void)(
			{},
			{ in: 3 },
			outs,
			{},
			48000,
		);

		expect(outs.out).toBe(3);
		expect([...fieldsView]).toEqual([3, 4]);
	});
});
