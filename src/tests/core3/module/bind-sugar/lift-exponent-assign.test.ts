/**
 * `x **= y` lifts to `x = x ** y` (card step 1): a plain target rewrites in
 * place; a member target whose index could have a side effect hoists the
 * index into a generated temp first, read once.
 */

import { describe, expect, it } from "vitest";

import { liftExponentAssign } from "@/core3/module/bind-sugar/lift-exponent-assign";

function lift(body: string): string {
	return liftExponentAssign(`(s, i, o) => { ${body} }`, "test");
}

describe("liftExponentAssign", () => {
	it("a local identifier target rewrites in place, keeping line count", () => {
		const before = "let x = 2; x **= 2; o.out = x;";
		const after = lift(before);
		expect(after).toBe("(s, i, o) => { let x = 2; x = x ** (2); o.out = x; }");
		expect(after.split("\n").length).toBe(before.split("\n").length);
	});

	it("a state field target rewrites in place", () => {
		expect(lift("s.x **= 2; o.out = s.x;")).toBe("(s, i, o) => { s.x = s.x ** (2); o.out = s.x; }");
	});

	it("a literal index rewrites in place", () => {
		expect(lift("s.buf[0] **= 2; o.out = s.buf[0];")).toBe(
			"(s, i, o) => { s.buf[0] = s.buf[0] ** (2); o.out = s.buf[0]; }",
		);
	});

	it("a side-effecting index (s.buf[s.n++] **= 2) hoists the index into a generated temp, read once", () => {
		const after = lift("s.buf[s.n++] **= 2; o.out = s.buf[0];");
		expect(after).toContain("let __sg_ix0 = 0;");
		expect(after).toContain("__sg_ix0 = (s.n++)");
		expect(after).toContain("s.buf[__sg_ix0] = s.buf[__sg_ix0] ** (2)");
	});

	it("text with no **= is returned unchanged", () => {
		const src = "(s, i, o) => { o.out = s.x * 2; }";
		expect(liftExponentAssign(src, "test")).toBe(src);
	});

	it("leaves the source on one line even with a hoisted temp", () => {
		const after = lift("s.buf[s.n++] **= 2; o.out = s.buf[0];");
		expect(after.split("\n").length).toBe(1);
	});
});
