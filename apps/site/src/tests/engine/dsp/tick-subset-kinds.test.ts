/**
 * The tick subset keeps booleans apart from numbers (module/front/kinds/) and
 * gives every variable an initial value, for every backend. A missing initial
 * value, a boolean state field and a lambda's refusals are loud errors at
 * eval; a kind refusal in a tick is a loud error at build, on both engines,
 * since it depends on the instance (module/front/types/specialise.ts). Each
 * names the module (or lambda) and the patch line; booleans in their own
 * variables and mixed in tests still pass.
 */

import { describe, expect, it } from "vitest";

import "@/engine/library/all";
import { getRegistry } from "@/engine/dsp/define";
import { InterpreterEngine } from "@/engine/runtime/interpreter-engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import type { Program } from "@/engine/types";
import { prepareWasm } from "@/engine/wasm/host/prepare-wasm";
import { evalPatch } from "@/engine/eval-patch";
import { evalInternal } from "../fixtures/internal-module";

const SR = 48000;

/** A patch defining module `t`; the tick body is on patch line 12. */
function patch(
	body: string,
	helpers = "",
	state = "{ n: 0, buf: new Float32Array(2) }",
	config = '{ on: true, mode: "a" }',
	use = "t().out()",
): string {
	return [
		"const t = defineInternalModule({",
		'  name: "t",',
		'  category: "utils",',
		"  ins: { in: sig(0) },",
		"  outs: { out: sig() },",
		'  defaultIn: "in",',
		'  defaultOut: "out",',
		`  config: ${config},`,
		`  state: () => (${state}),`,
		`  helpers: { ${helpers} },`,
		"  tick: (s, i, o, c) => {",
		`    ${body}`,
		"  },",
		"})",
		use,
	].join("\n");
}

/** Build `program` on the interpreter and on WASM; each must throw `error`. */
function expectBuildsToThrow(program: Program, error: RegExp): void {
	expect(() => new InterpreterEngine(program, SR, withProgramSpecs(getRegistry(), program))).toThrow(
		error,
	);
	expect(() => prepareWasm(program, SR)).toThrow(error);
}

function expectBuilds(program: Program): void {
	expect(
		() => new InterpreterEngine(program, SR, withProgramSpecs(getRegistry(), program)),
	).not.toThrow();
	expect(() => prepareWasm(program, SR)).not.toThrow();
}

const ALLOWED: readonly [string, string][] = [
	["a boolean in its own const", "const on = i.in > 0; o.out = on ? 1 : 0;"],
	["a boolean let given booleans", "let on = false; on = i.in > 0; o.out = on ? 1 : 0;"],
	["a mix in an if", "if (s.n && i.in > 0) o.out = 1;"],
	["a mix in a ?: test", "o.out = (s.n || i.in > 0) ? 1 : 0;"],
	["a mix under !", "o.out = !(s.n && i.in > 0) ? 1 : 0;"],
	["a boolean stored in a typed array", "s.buf[0] = i.in > 0; o.out = s.buf[0];"],
	["a boolean compared with a number", "o.out = (i.in > 0) === 1 ? 1 : 0;"],
	["a helper returning booleans", "o.out = pos(i.in) ? 1 : 0;"],
	// The unpatched input is the constant 0: the instance folds the number arm away.
	[
		"a ?: kept as both when a constant input picks one arm",
		"const v = i.in > 0 ? 1 : false; o.out = v ? 1 : 0;",
	],
];

const HELPERS =
	"pos: (x) => x > 0, mixed: (x) => { if (x > 0) return true; return 0; }, id: (x) => x";

const REJECTED: readonly [string, string, RegExp][] = [
	["a boolean stored in an output", "o.out = i.in > 0;", /a boolean stored where a number is kept/],
	[
		"a boolean stored in a state field",
		"s.n = i.in > 0;",
		/a boolean stored where a number is kept/,
	],
	[
		"a boolean stored in a number local",
		"let v = 0; v = i.in > 0; o.out = v;",
		/a boolean stored where a number is kept/,
	],
	["a config boolean stored", "o.out = c.on;", /a boolean stored where a number is kept/],
	[
		"a boolean through a helper",
		"o.out = id(i.in > 0);",
		/a boolean stored where a number is kept/,
	],
	[
		"a number stored in a boolean local",
		"let on = false; on = i.in; o.out = on ? 1 : 0;",
		/a number stored in a boolean variable/,
	],
	["++ on a boolean", "let on = true; on++; o.out = 0;", /\+\+\/-- need a number variable/],
	[
		"a ?: kept as both",
		"const v = s.n > 0 ? 1 : false; o.out = v ? 1 : 0;",
		/this value is a boolean on one path and a number on another/,
	],
	[
		"&& kept as both",
		"const v = s.n && i.in > 0; o.out = v ? 1 : 0;",
		/this value is a boolean on one path and a number on another/,
	],
	[
		"?? kept as both",
		"const v = s.buf[s.n] ?? false; o.out = v ? 1 : 0;",
		/this value is a boolean on one path and a number on another/,
	],
];

describe("tick subset: booleans and initial values", () => {
	for (const [what, body] of ALLOWED)
		it(`allows ${what}`, () => {
			expectBuilds(evalInternal(patch(body, HELPERS)));
		});

	for (const [what, body, error] of REJECTED)
		it(`rejects ${what} at build on both engines, naming the module and line`, () => {
			expectBuildsToThrow(
				evalInternal(patch(body, HELPERS)),
				new RegExp(`defmod\\('t'\\): tick at patch line 12: ${error.source}`),
			);
		});

	it("rejects a helper returning booleans and numbers at build, at its line", () => {
		expectBuildsToThrow(
			evalInternal(patch("o.out = mixed(i.in) ? 1 : 0;", HELPERS)),
			/defmod\('t'\): helper 'mixed' at patch line 10: it returns booleans and numbers/,
		);
	});

	it("rejects at build a form only a non-default config selects", () => {
		const config = (use: string) => patch("o.out = c.on;", "", "{ n: 0 }", "{ on: 0 }", use);
		expectBuilds(evalInternal(config("t().out()")));
		expectBuildsToThrow(
			evalInternal(config("t({ on: true }).out()")),
			/defmod\('t'\): tick at patch line 12: a boolean stored where a number is kept/,
		);
	});

	it("rejects a let that may be read before it is assigned", () => {
		expect(() => evalInternal(patch("let x; if (i.in > 0) { x = 1; } o.out = x;", HELPERS))).toThrow(
			/defmod\('t'\) tick: 'x' may be read before it has a value/,
		);
	});

	it("rejects a boolean state field", () => {
		expect(() => evalInternal(patch("o.out = 0;", "", "{ on: false }"))).toThrow(
			"defmod('t'): state field 'on' is a boolean",
		);
	});

	it("rejects a lambda returning a boolean", () => {
		expect(() => evalPatch("sin((s, sr, t) => t > 1).gain(0.1).out()")).toThrow(
			/lambda: lambda at patch line 1: a lambda must return a number/,
		);
	});

	it("rejects a lambda with an unset variable", () => {
		expect(() => evalPatch("sin((s, sr, t) => { let x; return 60; }).gain(0.1).out()")).toThrow(
			/every variable needs an initial value/,
		);
	});
});
