/**
 * `let x;` with no initializer lifts to `let x = 0;` when every path
 * assigns `x` before any read (card step 10); otherwise a loud error names
 * the variable and says what to write instead.
 */

import { describe, expect, it } from "vitest";

import { liftLetNoValue } from "@/dsp/bind-sugar/lift-let-no-value";

function lift(body: string): string {
	return liftLetNoValue(`(s, i, o) => { ${body} }`, "test");
}

describe("liftLetNoValue", () => {
	it("an uninitialised let assigned on the very next line lifts to = 0", () => {
		expect(lift("let x; x = 1; o.out = x")).toBe("(s, i, o) => { let x = 0; x = 1; o.out = x }");
	});

	it("both branches of an if assigning it lifts", () => {
		expect(lift("let x; if (i.in > 0) { x = 1 } else { x = 2 } o.out = x")).toBe(
			"(s, i, o) => { let x = 0; if (i.in > 0) { x = 1 } else { x = 2 } o.out = x }",
		);
	});

	it("an if with no else, read after, is a loud error naming the variable", () => {
		expect(() => lift("let x; if (i.in > 0) { x = 1 } o.out = x")).toThrow(
			/'x' may be read before it has a value — give it a starting value, e\.g\. `let x = 0`/,
		);
	});

	it("an early return on the untaken path still requires the other branch to assign", () => {
		expect(lift("let x; if (i.in > 0) { return } else { x = 1 } o.out = x")).toBe(
			"(s, i, o) => { let x = 0; if (i.in > 0) { return } else { x = 1 } o.out = x }",
		);
	});

	it("every switch case and a default assigning it lifts", () => {
		expect(
			lift("let x; switch (s.n) { case 0: x = 1; break; default: x = 2 } o.out = x"),
		).toBe("(s, i, o) => { let x = 0; switch (s.n) { case 0: x = 1; break; default: x = 2 } o.out = x }");
	});

	it("a switch with no default is a loud error even if every present case assigns", () => {
		expect(() => lift("let x; switch (s.n) { case 0: x = 1; break } o.out = x")).toThrow(
			/'x' may be read before it has a value/,
		);
	});

	it("an assignment inside a loop body does not count as definite, since the loop may run zero times", () => {
		expect(() => lift("let x; for (const v of s.voices) { x = v.x } o.out = x")).toThrow(
			/'x' may be read before it has a value/,
		);
	});

	it("a read with no prior assignment on any path is a loud error", () => {
		expect(() => lift("let x; o.out = x; x = 1")).toThrow(/'x' may be read before it has a value/);
	});

	it("an already-initialised let is left unchanged", () => {
		const src = "(s, i, o) => { let x = 0; x = 1; o.out = x; }";
		expect(liftLetNoValue(src, "test")).toBe(src);
	});

	it("a const is never touched (it is already required to have an initializer)", () => {
		const src = "(s, i, o) => { const x = 1; o.out = x; }";
		expect(liftLetNoValue(src, "test")).toBe(src);
	});

	it("a local that is never read is lifted even though it is never assigned either", () => {
		expect(lift("let x; o.out = 1")).toBe("(s, i, o) => { let x = 0; o.out = 1 }");
	});
});
