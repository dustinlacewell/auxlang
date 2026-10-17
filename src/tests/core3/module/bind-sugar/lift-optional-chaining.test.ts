/**
 * Optional chaining strips to its plain form (card step 7): `a?.b`,
 * `a?.[i]`, `f?.()` become `a.b`, `a[i]`, `f()` — a path through state,
 * inputs, outputs and helper records is never null.
 */

import { describe, expect, it } from "vitest";

import { liftOptionalChaining } from "@/core3/module/bind-sugar/lift-optional-chaining";

describe("liftOptionalChaining", () => {
	it("?. on a named member becomes the dot form", () => {
		const src = "(s, i, o) => { o.out = s?.n; }";
		expect(liftOptionalChaining(src, "test")).toBe("(s, i, o) => { o.out = s.n; }");
	});

	it("?.[ on a computed member becomes the plain index form", () => {
		const src = "(s, i, o) => { o.out = s.buf?.[s.n]; }";
		expect(liftOptionalChaining(src, "test")).toBe("(s, i, o) => { o.out = s.buf[s.n]; }");
	});

	it("?.( on a call becomes the plain call form", () => {
		const src = "(s, i, o, cfg, sr, width, f) => { o.out = f?.(); }";
		expect(liftOptionalChaining(src, "test")).toBe("(s, i, o, cfg, sr, width, f) => { o.out = f(); }");
	});

	it("text with no optional chaining is returned unchanged", () => {
		const src = "(s, i, o) => { o.out = s.n; }";
		expect(liftOptionalChaining(src, "test")).toBe(src);
	});
});
