/**
 * The tick subset (MANIFESTO §5.1): every form outside it is a loud error at
 * eval naming the module, the function and the patch line; the forms inside
 * it compile and run. Patches go through evalPatch, so the line is the
 * patch's own.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { render } from "@/core3/runtime/render";
import { evalPatch } from "@/ui/core3-playground/eval-patch";

/** A patch defining module `t`; the tick body starts on patch line 11. */
function patch(body: string, helpers = "", after = ""): string {
	return [
		"defmod({",
		'  name: "t",',
		'  category: "utils",',
		"  ins: { in: sig(0) },",
		"  outs: { out: sig() },",
		'  defaultIn: "in",',
		'  defaultOut: "out",',
		"  state: () => ({ n: 0, buf: new Float32Array(4), arr: new Float64Array(2), voice: { gain: 1 } }),",
		`  helpers: { ${helpers} },`,
		"  tick: (s, i, o, c) => {",
		`    ${body}`,
		"  },",
		"})",
		after,
	].join("\n");
}

const FORBIDDEN: readonly [string, string, RegExp][] = [
	["object literal", "const v = { x: 1 };", /object literals allocate/],
	["array literal", "const v = [1, 2];", /array literals allocate/],
	["new", "const v = new Float32Array(2);", /`new` allocates/],
	["nested function", "const f = (x) => x;", /nested functions are closures/],
	["template string", "const v = `a${i.in}`;", /template strings/],
	["runtime string", 'const v = "a" + i.in;', /string values may appear only in comparisons/],
	[
		"computed string key",
		'o.out = s.voice["gain"];',
		/computed property names with non-numeric keys/,
	],
	["adding a field", "s.extra = 1;", /adds field 's\.extra'/],
	["adding a nested field", "s.voice.pan = 1;", /adds field 's\.voice\.pan'/],
	["growing an array by length", "s.arr.length = 3;", /writing \.length/],
	[
		"growing an array by push",
		"s.arr.push(1);",
		/only Math\.\*, helpers and hashRandom\(key\) may be called/,
	],
	["for...of", "for (const x of s.arr) o.out = x;", /for\.\.\.of/],
	["delete", "delete s.n;", /`delete` removes fields/],
	["writing an input", "i.in = 2;", /inputs and config are read-only/],
	["unknown input", "o.out = i.nope;", /unknown input 'nope'/],
	["unknown output", "o.nope = 1;", /unknown output 'nope'/],
	["hashRandom with a seed", "o.out = hashRandom(1, 2);", /hashRandom\(key\) takes one argument/],
	["Math.random with an argument", "o.out = Math.random(1);", /Math\.random\(\) takes no arguments/],
	["auxlang math with two arguments", "o.out = Math.sin(1, 2);", /Math\.sin takes one argument/],
	["auxlang math with none", "o.out = Math.atan2();", /Math\.atan2 takes 2 arguments/],
	["a free host global", "o.out = globalThis.x;", /'globalThis' is not defined here/],
];

describe("tick subset: each forbidden form throws with its patch line", () => {
	it.each(FORBIDDEN)("%s", (_label, body, reason) => {
		expect(() => evalPatch(patch(body))).toThrow(/defmod\('t'\): tick at patch line 11: /);
		expect(() => evalPatch(patch(body))).toThrow(reason);
	});

	it("a name of auxlang's library, beside a call the binding gives that name", () => {
		expect(() => evalPatch(patch("o.out = Math.sin(1) + __math_sin(1);"))).toThrow(
			/defmod\('t'\) tick: the name '__math_sin' is reserved/,
		);
		expect(() => evalPatch(patch("o.out = hashRandom(1) + __random_hashNumber(1, 2);"))).toThrow(
			/defmod\('t'\) tick: the name '__random_hashNumber' is reserved/,
		);
	});

	it("a closure over a patch variable", () => {
		expect(() => evalPatch(patch("o.out = depth;", "", "const depth = 2"))).toThrow(
			/tick at patch line 11: 'depth' is not defined here/,
		);
	});

	it("a helper that recurses", () => {
		expect(() => evalPatch(patch("o.out = a(1);", "a: (x) => b(x), b: (x) => a(x)"))).toThrow(
			/helper 'b' at patch line 9: helpers may not recurse \(a → b → a\)/,
		);
	});

	it("Math.random() in a helper", () => {
		expect(() => evalPatch(patch("o.out = r();", "r: () => Math.random()"))).toThrow(
			/helper 'r' at patch line 9: Math\.random\(\) is available only in tick/,
		);
	});

	it("a helper closing over a patch variable", () => {
		expect(() => evalPatch(patch("o.out = h();", "h: () => depth", "const depth = 2"))).toThrow(
			/helper 'h' at patch line 9: 'depth' is not defined here/,
		);
	});
});

describe("tick subset: the forms inside it compile and run", () => {
	it("arithmetic, Math, branches, loops, switch on config, typeof, state arrays and helpers", () => {
		const code = [
			"const ok = defmod({",
			'  name: "ok",',
			'  category: "utils",',
			"  ins: { in: sig(0) },",
			"  outs: { out: sig() },",
			'  defaultIn: "in",',
			'  defaultOut: "out",',
			'  config: { mode: "double" },',
			"  state: () => ({ buf: new Float32Array(4), k: 0 }),",
			"  helpers: { twice: (x) => x * 2, clampUnit: (x) => Math.max(0, Math.min(1, twice(x) / 2)) },",
			"  tick: (s, i, o, c) => {",
			"    let acc = 0;",
			"    for (let k = 0; k < s.buf.length; k++) acc += s.buf[k];",
			"    s.buf[s.k] = i.in;",
			"    s.k = (s.k + 1) % s.buf.length;",
			"    let v = acc / 4;",
			"    switch (c.mode) {",
			'      case "double": v = twice(v); break;',
			"      default: v = 0;",
			"    }",
			'    if (typeof v === "number") o.out = clampUnit(v) * 0.5;',
			"  },",
			"})",
			"ok({ in: 0.5 }).out()",
		].join("\n");
		const { l } = render(evalPatch(code), 0.01);
		expect(Math.max(...l)).toBeGreaterThan(0.1);
	});
});

describe("signal lambdas follow the same rules", () => {
	it("a lambda closing over a patch variable throws, naming its patch line", () => {
		const code = "const k = 3\nsin().mul((s, sr, t) => k * t).out()";
		expect(() => evalPatch(code)).toThrow(
			/lambda: lambda at patch line 2: 'k' is not defined here/,
		);
	});

	it("a lambda may not use Math.random()", () => {
		expect(() => evalPatch("sin().mul((s, sr, t) => Math.random()).out()")).toThrow(
			/Math\.random\(\) is available only in tick/,
		);
	});

	it("a closure-free lambda compiles", () => {
		expect(() => evalPatch("sin().mul((s, sr, t) => Math.sin(t * 3)).out()")).not.toThrow();
	});
});
