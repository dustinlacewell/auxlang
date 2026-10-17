/**
 * `??` off a local fed from a direct array element read lifts to a validity
 * flag computed beside the declaration and a ternary at the use (card step
 * 12). The direct form, an unrelated local, and a reassigned local are left
 * untouched.
 */

import { describe, expect, it } from "vitest";

import { liftNullishElement } from "@/core3/module/bind-sugar/lift-nullish-element";

function lift(body: string): string {
	return liftNullishElement(`(s, i, o) => { ${body} }`, "test");
}

describe("liftNullishElement", () => {
	it("a local fed from a direct element lifts to a validity flag and a ternary", () => {
		expect(lift("const v = s.a[s.n]; o.out = v ?? 0;")).toBe(
			"(s, i, o) => { const __sg_ni0 = (s.n); const __sg_nok0 = __sg_ni0 === Math.trunc(__sg_ni0) && __sg_ni0 >= 0 && __sg_ni0 < s.a.length; const v = s.a[__sg_ni0]; o.out = (__sg_nok0 ? v : (0)); }",
		);
	});

	it("a direct element with no local is left as written", () => {
		const src = "(s, i, o) => { o.out = s.a[s.n] ?? 0; }";
		expect(liftNullishElement(src, "test")).toBe(src);
	});

	it("text with no `??` is returned unchanged", () => {
		const src = "(s, i, o) => { const v = s.a[s.n]; o.out = v; }";
		expect(liftNullishElement(src, "test")).toBe(src);
	});

	it("a local reassigned after its declaration is left as written", () => {
		const src = "(s, i, o) => { let v = s.a[s.n]; v = 0; o.out = v ?? 0; }";
		expect(liftNullishElement(src, "test")).toBe(src);
	});

	it("a sibling declarator in the same statement keeps its own init", () => {
		const after = lift("const v = s.a[s.n], w = s.n; o.out = v ?? w;");
		expect(after).toContain("const v = s.a[__sg_ni0], w = s.n;");
		expect(after).toContain("o.out = (__sg_nok0 ? v : (w));");
	});

	it("an unrelated identifier's `??` is left as written", () => {
		const src = "(s, i, o) => { o.out = s.n ?? 0; }";
		expect(liftNullishElement(src, "test")).toBe(src);
	});
});
