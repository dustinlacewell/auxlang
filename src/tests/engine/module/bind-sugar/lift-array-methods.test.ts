/**
 * `fill`/`set`/`copyWithin`/`forEach` lift to the index loops the tick
 * subset already accepts (card step 5): no allocation, and `set`'s target
 * bound is `src.length`, provable where the plan's existing index reasoning
 * already proves it. A non-statement use, a non-inline-arrow `forEach`
 * callback, or a callback with an unsupported parameter shape is a loud
 * error naming the fix.
 */

import { describe, expect, it } from "vitest";

import { liftArrayMethods } from "@/engine/module/bind-sugar/lift-array-methods";

function lift(body: string): string {
	return liftArrayMethods(`(s, i, o) => { ${body} }`, "test");
}

describe("liftArrayMethods", () => {
	it("fill with only a value loops the whole length", () => {
		expect(lift("s.buf.fill(0); o.out = s.buf[0]")).toBe(
			"(s, i, o) => { const __sg_fv0 = (0); for (let __sg_fl1 = 0; __sg_fl1 < s.buf.length; __sg_fl1++) s.buf[__sg_fl1] = __sg_fv0;; o.out = s.buf[0] }",
		);
	});

	it("fill with start and end loops between them", () => {
		expect(lift("s.buf.fill(1, 1, 3); o.out = s.buf[0]")).toBe(
			"(s, i, o) => { const __sg_fv0 = (1); const __sg_fs1 = (1); const __sg_fe2 = (3); for (let __sg_fl3 = __sg_fs1; __sg_fl3 < __sg_fe2; __sg_fl3++) s.buf[__sg_fl3] = __sg_fv0;; o.out = s.buf[0] }",
		);
	});

	it("fill with no arguments is a loud error naming the missing value", () => {
		expect(() => lift("s.buf.fill(); o.out = 1")).toThrow(/fill needs its value argument/);
	});

	it("set with no offset copies from index 0", () => {
		expect(lift("s.buf.set(s.a); o.out = s.buf[0]")).toBe(
			"(s, i, o) => { for (let __sg_st0 = 0; __sg_st0 < s.a.length; __sg_st0++) s.buf[__sg_st0 + 0] = s.a[__sg_st0];; o.out = s.buf[0] }",
		);
	});

	it("set with an offset shifts the write index", () => {
		expect(lift("s.buf.set(s.a, 1); o.out = s.buf[0]")).toBe(
			"(s, i, o) => { const __sg_so0 = (1); for (let __sg_st1 = 0; __sg_st1 < s.a.length; __sg_st1++) s.buf[__sg_st1 + __sg_so0] = s.a[__sg_st1];; o.out = s.buf[0] }",
		);
	});

	it("set with no source is a loud error naming the missing argument", () => {
		expect(() => lift("s.buf.set(); o.out = 1")).toThrow(/set needs its src argument/);
	});

	it("copyWithin forward when the target does not overtake the source", () => {
		const after = lift("s.buf.copyWithin(0, 2); o.out = s.buf[0]");
		expect(after).toContain("if ((__sg_ct0) <= (__sg_cs1))");
		expect(after).toContain("__sg_ci3 = 0; __sg_ci3 < __sg_cn2; __sg_ci3++");
	});

	it("copyWithin with an explicit end bounds the count", () => {
		const after = lift("s.buf.copyWithin(2, 0, 2); o.out = s.buf[0]");
		expect(after).toContain("const __sg_ce2 = (2)");
	});

	it("copyWithin with no target/start is a loud error naming the missing argument", () => {
		expect(() => lift("s.buf.copyWithin(); o.out = 1")).toThrow(/copyWithin needs its target argument/);
		expect(() => lift("s.buf.copyWithin(0); o.out = 1")).toThrow(/copyWithin needs its start argument/);
	});

	it("forEach with one parameter binds the value, no index local", () => {
		expect(lift("s.buf.forEach((v) => { s.acc += v }); o.out = s.acc")).toBe(
			"(s, i, o) => { for (let __sg_fe0 = 0; __sg_fe0 < s.buf.length; __sg_fe0++) { const v = s.buf[__sg_fe0];  s.acc += v }; o.out = s.acc }",
		);
	});

	it("forEach with two parameters binds the value and the index", () => {
		expect(lift("s.buf.forEach((v, k) => { s.buf[k] = v * 2 }); o.out = s.buf[0]")).toBe(
			"(s, i, o) => { for (let __sg_fe0 = 0; __sg_fe0 < s.buf.length; __sg_fe0++) { const v = s.buf[__sg_fe0]; const k = __sg_fe0;  s.buf[k] = v * 2 }; o.out = s.buf[0] }",
		);
	});

	it("forEach with an expression-body callback wraps it as a statement", () => {
		expect(lift("s.buf.forEach((v, k) => s.buf[k] = v * 2); o.out = s.buf[0]")).toBe(
			"(s, i, o) => { for (let __sg_fe0 = 0; __sg_fe0 < s.buf.length; __sg_fe0++) { const v = s.buf[__sg_fe0]; const k = __sg_fe0; s.buf[k] = v * 2; }; o.out = s.buf[0] }",
		);
	});

	it("forEach with a non-arrow callback is a loud error", () => {
		expect(() => lift("s.buf.forEach(f); o.out = 1")).toThrow(/callback must be an inline arrow/);
	});

	it("forEach with a destructured parameter is a loud error", () => {
		expect(() => lift("s.buf.forEach(({ x }) => { s.acc += x }); o.out = s.acc")).toThrow(
			/takes 1 or 2 plain parameters/,
		);
	});

	it("forEach with three parameters is a loud error", () => {
		expect(() => lift("s.buf.forEach((v, k, arr) => { s.acc += v }); o.out = s.acc")).toThrow(
			/takes 1 or 2 plain parameters/,
		);
	});

	it("a method call used as a value, not its own statement, is a loud error", () => {
		expect(() => lift("let x = s.buf.fill(0); o.out = x")).toThrow(
			/\.fill\(\.\.\.\) is lifted only as its own statement, not as a value/,
		);
	});

	it("a non-path value argument is hoisted into its own const, read once", () => {
		const after = lift("s.buf.fill(s.n++); o.out = s.buf[0]");
		expect(after).toContain("const __sg_fv0 = (s.n++);");
	});

	it("text with no array method call is returned unchanged", () => {
		const src = "(s, i, o) => { o.out = s.buf[0]; }";
		expect(liftArrayMethods(src, "test")).toBe(src);
	});
});
