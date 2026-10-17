/**
 * A nested arrow that writes no captured local lifts to a top-level helper
 * (card step 8): its own params stay, a free read becomes a trailing param,
 * filled in at every call by reading that same name again. A free write is a
 * loud error naming the arrow and the name.
 */

import { describe, expect, it } from "vitest";

import { liftNestedArrows } from "@/core3/module/bind-sugar/lift-nested-arrows";

function lift(body: string) {
	return liftNestedArrows(`(s, i, o) => { ${body} }`, "test");
}

describe("liftNestedArrows", () => {
	it("an arrow with no captured reads lifts with its own params unchanged", () => {
		const result = lift("const lerp = (a, b, t) => a + (b - a) * t; o.out = lerp(1, 2, 0.5)");
		expect(result.text).toBe("(s, i, o) => {                                            o.out = lerp(1, 2, 0.5) }");
		expect(result.helpers.get("lerp")).toBe("function lerp(a, b, t) { return (a + (b - a) * t); }");
	});

	it("a captured read becomes a trailing param, filled in at the call", () => {
		const result = lift("const addK = (a) => a + s.n; o.out = addK(1)");
		expect(result.text).toBe("(s, i, o) => {                              o.out = addK(1, s) }");
		expect(result.helpers.get("addK")).toBe("function addK(a, s) { return (a + s.n); }");
	});

	it("a block-bodied arrow keeps its own block", () => {
		const result = lift("const twice = (a) => { return a * 2 }; o.out = twice(3)");
		expect(result.helpers.get("twice")).toBe("function twice(a) { return a * 2 }");
	});

	it("a nested arrow inside the hoisted one lifts first; the outer helper gains the inner's own captured param too, since its relayed call needs it", () => {
		const result = lift(
			"const outer = (a) => { const inner = (b) => b + s.n; return inner(a) }; o.out = outer(1)",
		);
		expect(result.helpers.get("inner")).toBe("function inner(b, s) { return (b + s.n); }");
		expect(result.helpers.get("outer")).toBe(
			"function outer(a, s) {                               return inner(a, s) }",
		);
		expect(result.text).toContain("o.out = outer(1, s)");
	});

	it("more than one captured read becomes more than one trailing param, in reference order", () => {
		const result = lift("const f = (x) => x + s.n + i.in; o.out = f(1)");
		expect(result.helpers.get("f")).toBe("function f(x, s, i) { return (x + s.n + i.in); }");
		expect(result.text).toContain("o.out = f(1, s, i)");
	});

	it("writing a captured name is a loud error naming the arrow and the name", () => {
		expect(() => lift("const bad = (a) => { s.n = a; return a }; o.out = bad(1)")).toThrow(
			/the nested arrow lifted as 'bad' writes 's'/,
		);
	});

	it("updating a captured name (c++) is a loud error", () => {
		expect(() => lift("const bad = () => { s.n++; return s.n }; o.out = bad()")).toThrow(
			/the nested arrow lifted as 'bad' writes 's'/,
		);
	});

	it("passing a captured name as a call argument is a loud error (it may be mutated through)", () => {
		expect(() => lift("const g = (x) => x; const bad = () => { fill(g); return 1 }; o.out = bad()")).toThrow(
			/the nested arrow lifted as 'bad' writes 'g'/,
		);
	});

	it("text with no nested arrow is returned unchanged, with no helpers", () => {
		const src = "(s, i, o) => { o.out = s.x * 2; }";
		const result = liftNestedArrows(src, "test");
		expect(result.text).toBe(src);
		expect(result.helpers.size).toBe(0);
	});

	it("an arrow bound by let, not const, is left for the tick subset's own nested-function rule", () => {
		const result = lift("let f = (a) => a; o.out = f(1)");
		expect(result.helpers.size).toBe(0);
	});
});
