/**
 * `??` only on a direct array element read (front/rules/check-nullish.ts):
 * `a[j] ?? d` and chains of such reads pass; anything else is a loud error
 * at eval naming the module and the patch line.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { evalPatch } from "@/ui/core3-playground/eval-patch";

/** A patch defining module `t`; the tick body is on patch line 10. */
function patch(body: string): string {
	return [
		"const t = defmod({",
		'  name: "t",',
		'  category: "utils",',
		"  ins: { in: sig(0) },",
		"  outs: { out: sig() },",
		'  defaultIn: "in",',
		'  defaultOut: "out",',
		"  state: () => ({ a: new Float64Array(4), b: new Float32Array(2), n: 0 }),",
		"  tick: (s, i, o, c) => {",
		`    ${body}`,
		"  },",
		"})",
		"t().out()",
	].join("\n");
}

const ALLOWED: readonly [string, string][] = [
	["a direct element", "o.out = s.a[s.n] ?? 0;"],
	["a chain of direct elements", "o.out = s.a[s.n] ?? s.b[s.n] ?? 1;"],
	["a direct element through a local array", "const a = s.a; o.out = a[i.in] ?? 2;"],
];

const REJECTED: readonly [string, string][] = [
	["an element kept in a local", "const x = s.a[s.n]; o.out = x ?? 0;"],
	["a state field", "o.out = s.n ?? 0;"],
	["an input", "o.out = i.in ?? 0;"],
	["a config field", "o.out = c.k ?? 3;"],
	["a chain through a local", "const x = s.a[1]; o.out = (s.a[0] ?? x) ?? 0;"],
	["`??=` on a local", "let x = 0; x ??= 2; o.out = x;"],
];

describe("tick subset: `??`", () => {
	for (const [what, body] of ALLOWED)
		it(`allows ${what}`, () => {
			expect(() => evalPatch(patch(body))).not.toThrow();
		});

	for (const [what, body] of REJECTED)
		it(`rejects ${what}, naming the module and line`, () => {
			expect(() => evalPatch(patch(body))).toThrow(
				/defmod\('t'\): tick at patch line 10: `\?\?` is allowed only on a direct array element read/,
			);
		});
});
