/**
 * The checker reads names through block scopes (front/scope/): a local
 * lives only in its block and from its declaration on, and a local that
 * shadows a parameter or a helper is that local, not what it hides.
 */

import { describe, expect, it } from "vitest";

import "@/library/all";
import { evalInternal } from "../../testing/internal-module";

/** A patch defining module `t`; the tick body starts on patch line 11. */
function patch(body: string, helpers = ""): string {
	return [
		"defineInternalModule({",
		'  name: "t",',
		'  category: "utils",',
		"  ins: { in: sig(0) },",
		"  outs: { out: sig() },",
		'  defaultIn: "in",',
		'  defaultOut: "out",',
		"  state: () => ({ n: 0 }),",
		`  helpers: { ${helpers} },`,
		"  tick: (s, i, o, c) => {",
		`    ${body}`,
		"  },",
		"})",
	].join("\n");
}

const REJECTED: readonly [string, string, RegExp][] = [
	[
		"a block local used after its block",
		"{ let x = 1; } o.out = x;",
		/'x' is used outside the block that declares it/,
	],
	[
		"a loop counter used after the loop",
		"for (let k = 0; k < 2; k++) {} o.out = k;",
		/'k' is used outside the block that declares it/,
	],
	["a use before the declaration", "o.out = x; let x = 1;", /'x' is used before its declaration/],
	["a let read in its own initialiser", "let x = x + 1; o.out = x;", /'x' is used before its declaration/],
];

describe("tick subset: block scopes", () => {
	it.each(REJECTED)("rejects %s", (_label, body, reason) => {
		expect(() => evalInternal(patch(body))).toThrow(/defmod\('t'\): tick at patch line 11: /);
		expect(() => evalInternal(patch(body))).toThrow(reason);
	});

	it("accepts a block const shadowing a parameter", () => {
		expect(() => evalInternal(patch("{ const i = 2; o.out = i; } o.out += i.in;"))).not.toThrow();
	});

	it("accepts a block const shadowing a helper", () => {
		expect(() => evalInternal(patch("o.out = f(1); { const f = 2; o.out += f; }", "f: (x) => x"))).not.toThrow();
	});

	it("does not take a local named like the outputs parameter for the outputs", () => {
		expect(() => evalInternal(patch("{ const o = 1; s.n = o; } o.out = s.n;"))).not.toThrow();
	});

	it("does not take a local named like the state parameter for the state", () => {
		expect(() => evalInternal(patch("{ const s = i.in; o.out = s; }"))).not.toThrow();
	});
});
