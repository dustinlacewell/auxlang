/**
 * `for...of` lifts to an index loop (card step 3): a plain path is read
 * twice in place; anything else is hoisted into a `const` once before the
 * loop. `break`/`continue` and nesting carry through unchanged. A
 * destructuring head is a loud error naming the fix.
 */

import { describe, expect, it } from "vitest";

import { liftForOf } from "@/core3/module/bind-sugar/lift-for-of";

function lift(body: string): string {
	return liftForOf(`(s, i, o) => { ${body} }`, "test");
}

describe("liftForOf", () => {
	it("a plain member path is read in place for both the length test and the index", () => {
		expect(lift("for (const v of s.voices) { v.x += 1 }")).toBe(
			"(s, i, o) => { { for (let __sg_i0 = 0; __sg_i0 < s.voices.length; __sg_i0++) { const v = s.voices[__sg_i0]; { v.x += 1 } } } }",
		);
	});

	it("a `let` head keeps its `let`", () => {
		expect(lift("for (let v of s.voices) { v.x += 1 }")).toBe(
			"(s, i, o) => { { for (let __sg_i0 = 0; __sg_i0 < s.voices.length; __sg_i0++) { let v = s.voices[__sg_i0]; { v.x += 1 } } } }",
		);
	});

	it("a non-path iterable is hoisted into a const, read once", () => {
		const after = lift("let acc = 0; for (const x of f(s.buf)) { acc += x }");
		expect(after).toContain("const __sg_it0 = (f(s.buf));");
		expect(after).toContain("__sg_i0 < __sg_it0.length");
		expect(after).toContain("const x = __sg_it0[__sg_i0];");
	});

	it("break and continue pass through unchanged inside the lifted body", () => {
		const after = lift("for (const v of s.voices) { if (v.x > 2) continue; if (v.x > 5) break; v.x += 1 }");
		expect(after).toContain("if (v.x > 2) continue;");
		expect(after).toContain("if (v.x > 5) break;");
	});

	it("a nested for...of lifts both loops, innermost included", () => {
		const after = lift("let acc = 0; for (const a of s.rows) { for (const b of a.cols) { acc += b } }");
		expect(after).toContain("__sg_i0 < s.rows.length");
		expect(after).toContain("__sg_i1 < a.cols.length");
		expect(after).toContain("const a = s.rows[__sg_i0];");
		expect(after).toContain("const b = a.cols[__sg_i1];");
	});

	it("a destructuring head reaching liftForOf unlowered throws, naming the fix (lift-destructuring runs first in bind-sugar)", () => {
		expect(() => lift("for (const {x} of s.voices) { o.out = x }")).toThrow(
			/lift-destructuring should have run first/,
		);
	});

	it("text with no for...of is returned unchanged", () => {
		const src = "(s, i, o) => { o.out = s.x * 2; }";
		expect(liftForOf(src, "test")).toBe(src);
	});
});
