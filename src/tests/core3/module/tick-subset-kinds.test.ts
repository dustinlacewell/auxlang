/**
 * The tick subset keeps booleans apart from numbers (tick-subset/kinds/) and
 * gives every variable an initial value, for every backend: each refusal is
 * a loud error at eval naming the module (or lambda) and the patch line;
 * booleans in their own variables and mixed in tests still pass.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { evalPatch } from "@/ui/core3-playground/eval-patch";

/** A patch defining module `t`; the tick body is on patch line 11. */
function patch(body: string, helpers = "", state = "{ n: 0, buf: new Float32Array(2) }"): string {
	return [
		"const t = defmod({",
		'  name: "t",',
		'  category: "utils",',
		"  ins: { in: sig(0) },",
		"  outs: { out: sig() },",
		'  defaultIn: "in",',
		'  defaultOut: "out",',
		'  config: { on: true, mode: "a" },',
		`  state: () => (${state}),`,
		`  helpers: { ${helpers} },`,
		"  tick: (s, i, o, c) => {",
		`    ${body}`,
		"  },",
		"})",
		"t().out()",
	].join("\n");
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
		"const v = i.in > 0 ? 1 : false; o.out = v ? 1 : 0;",
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
	[
		"a let with no initial value",
		"let x; x = 1; o.out = x;",
		/every variable needs an initial value/,
	],
];

describe("tick subset: booleans and initial values", () => {
	for (const [what, body] of ALLOWED)
		it(`allows ${what}`, () => {
			expect(() => evalPatch(patch(body, HELPERS))).not.toThrow();
		});

	for (const [what, body, error] of REJECTED)
		it(`rejects ${what}, naming the module and line`, () => {
			expect(() => evalPatch(patch(body, HELPERS))).toThrow(
				new RegExp(`defmod\\('t'\\): tick at patch line 12: ${error.source}`),
			);
		});

	it("rejects a helper returning booleans and numbers, at its line", () => {
		expect(() => evalPatch(patch("o.out = mixed(i.in) ? 1 : 0;", HELPERS))).toThrow(
			/defmod\('t'\): helper 'mixed' at patch line 10: it returns booleans and numbers/,
		);
	});

	it("rejects a boolean state field", () => {
		expect(() => evalPatch(patch("o.out = 0;", "", "{ on: false }"))).toThrow(
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
