/**
 * Destructuring lifts to plain declarations and member reads (card step 4):
 * object/array declarations, defaults (fired only on `undefined`), nested
 * patterns, helper params, a for...of pattern head (left for lift-for-of to
 * finish), and the two-element swap idiom. A rest element and any other
 * destructuring assignment are loud errors naming the fix.
 */

import { describe, expect, it } from "vitest";

import { liftDestructuring } from "@/dsp/bind-sugar/lift-destructuring";

function lift(body: string): string {
	return liftDestructuring(`(s, i, o) => { ${body} }`, "test");
}

describe("liftDestructuring", () => {
	it("an object declaration reads each field, a renamed field keeps its own name", () => {
		expect(lift("const { a, b: bb } = s.v; o.out = a + bb")).toBe(
			"(s, i, o) => { const a = s.v.a, bb = s.v.b; o.out = a + bb }",
		);
	});

	it("an array declaration reads each index", () => {
		expect(lift("const [x, y] = s.buf; o.out = x + y")).toBe(
			"(s, i, o) => { const x = s.buf[0], y = s.buf[1]; o.out = x + y }",
		);
	});

	it("a default fires only when the read is undefined", () => {
		expect(lift("const { c = 1 } = s.v; o.out = c")).toBe(
			"(s, i, o) => { const c = ((s.v.c) === undefined ? (1) : (s.v.c)); o.out = c }",
		);
	});

	it("a non-path init is hoisted into its own const, read once", () => {
		const after = lift("const { a } = f(s.v); o.out = a");
		expect(after).toContain("const __sg_d0 = (f(s.v));");
		expect(after).toContain("const a = __sg_d0.a;");
	});

	it("a nested object pattern recurses through the outer field", () => {
		expect(lift("const { p: { q } } = s; o.out = q")).toBe(
			"(s, i, o) => { const q = s.p.q; o.out = q }",
		);
	});

	it("a plain declarator beside a destructured one in one statement keeps its own init", () => {
		expect(lift("const n = s.n, { a } = s.v; o.out = n + a")).toBe(
			"(s, i, o) => { const n = s.n, a = s.v.a; o.out = n + a }",
		);
	});

	it("a rest element in an object pattern is a loud error", () => {
		expect(() => lift("const { a, ...r } = s.v; o.out = a")).toThrow(
			/rest element in destructuring allocates/,
		);
	});

	it("a rest element in an array pattern is a loud error", () => {
		expect(() => lift("const [a, ...r] = s.buf; o.out = a")).toThrow(
			/rest element in destructuring allocates/,
		);
	});

	it("a for...of destructuring head loses its pattern, left plain for lift-for-of", () => {
		const after = lift("for (const { x } of s.voices) { o.out = x }");
		expect(after).toContain("for (const __sg_dof0 of s.voices)");
		expect(after).toContain("const x = __sg_dof0.x;");
	});

	it("the two-element swap lifts to a temp exchange, no array literal, its temp declared at the top", () => {
		expect(lift("let a = 1, b = 2; [a, b] = [b, a]; o.out = a")).toBe(
			"(s, i, o) => { let __sg_sw0 = 0; let a = 1, b = 2; (__sg_sw0 = a, a = b, b = __sg_sw0); o.out = a }",
		);
	});

	it("a non-swap destructuring assignment is a loud error", () => {
		expect(() => lift("let a = 1, b = 2, c = 3; [a, b] = [b, c]; o.out = a")).toThrow(
			/only the two-element swap/,
		);
	});

	it("an object destructuring assignment is a loud error", () => {
		expect(() => lift("let a = 1; ({ a } = s.v); o.out = a")).toThrow(/only the two-element swap/);
	});

	it("a helper's destructured params become plain names with declarations at the top", () => {
		const after = liftDestructuring("({ a, b }, [x, y]) => a + b + x + y", "test");
		expect(after).toBe(
			"(__sg_p0, __sg_p1) => { let a = __sg_p0.a, b = __sg_p0.b; let x = __sg_p1[0], y = __sg_p1[1]; return (a + b + x + y); }",
		);
	});

	it("text with no destructuring is returned unchanged", () => {
		const src = "(s, i, o) => { o.out = s.x * 2; }";
		expect(liftDestructuring(src, "test")).toBe(src);
	});
});
