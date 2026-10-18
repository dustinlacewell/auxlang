/**
 * `??` only on a direct array element read (front/rules/check-nullish.ts):
 * `a[j] ?? d` and chains of such reads pass; a local fed from one direct
 * read also passes, lifted to a validity flag and a ternary
 * (bind-sugar/lift-nullish-element.ts); anything else is a loud error at
 * eval naming the module and the patch line.
 */

import { describe, expect, it } from "vitest";

import "@/library/all";
import { evalInternal } from "../../testing/internal-module";

/** A patch defining module `t`; the tick body is on patch line 10. */
function patch(body: string): string {
	return [
		"const t = defineInternalModule({",
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
	["an element kept in a local", "const x = s.a[s.n]; o.out = x ?? 0;"],
];

const REJECTED: readonly [string, string][] = [
	["a state field", "o.out = s.n ?? 0;"],
	["an input", "o.out = i.in ?? 0;"],
	["a config field", "o.out = c.k ?? 3;"],
	["a chain through a local", "const x = s.a[1]; o.out = (s.a[0] ?? x) ?? 0;"],
	["`??=` on a local", "let x = 0; x ??= 2; o.out = x;"],
	["a local fed from a direct element, reassigned before the `??`", "let x = s.a[s.n]; x = 0; o.out = x ?? 0;"],
];

describe("tick subset: `??`", () => {
	for (const [what, body] of ALLOWED)
		it(`allows ${what}`, () => {
			expect(() => evalInternal(patch(body))).not.toThrow();
		});

	for (const [what, body] of REJECTED)
		it(`rejects ${what}, naming the module and line`, () => {
			expect(() => evalInternal(patch(body))).toThrow(
				/defmod\('t'\): tick at patch line 10: `\?\?` is allowed only on a direct array element read/,
			);
		});
});
