/**
 * Records/typed arrays chosen through `?:` lift to the plain rebind the
 * tick subset already accepts (card step 9): a declaration selects an
 * address, firing only when both branches are plain paths that are not one
 * another's own path with one more member step (the number-fallback idiom,
 * left untouched); a returned record literal chosen through `?:` lifts per
 * field, not allocated. `??` between two refs is not lifted (not sound in
 * this type system — see lift-record-select.ts's own doc comment).
 */

import { describe, expect, it } from "vitest";

import { liftRecordSelect } from "@/core3/module/bind-sugar/lift-record-select";

function lift(body: string): string {
	return liftRecordSelect(`(s, i, o) => { ${body} }`, "test");
}

describe("liftRecordSelect", () => {
	it("a ternary between two array/record addresses lifts to a let rebound on the test", () => {
		expect(lift("const v = s.n > 50 ? s.voices[0] : s.voices[1]; v.x += 1; o.out = v.x")).toBe(
			"(s, i, o) => { let v = (s.voices[1]); if (s.n > 50) v = (s.voices[0]); v.x += 1; o.out = v.x }",
		);
	});

	it("?? between two array/record addresses is left untouched: not sound in this type system", () => {
		const src = "(s, i, o) => { const v = s.a ?? s.b; v[0] += 1; o.out = v[0] }";
		expect(liftRecordSelect(src, "test")).toBe(src);
	});

	it("a plain numeric ternary (cond ? 1 : 0) is left untouched", () => {
		const src = "(s, i, o) => { const down = i.in >= 0.5 ? 1 : 0; o.out = down }";
		expect(liftRecordSelect(src, "test")).toBe(src);
	});

	it("a whole-vs-element fallback (typeof lanes === 'number' ? lanes : lanes[l]) is left untouched: not a pick between two addresses", () => {
		const src = "(s, i, o) => { const v = typeof s.lanes === 'number' ? s.lanes : s.lanes[0]; o.out = v }";
		expect(liftRecordSelect(src, "test")).toBe(src);
	});

	it("a whole-vs-field fallback (v vs v.x) is left untouched the same way, either order", () => {
		const src = "(s, i, o) => { const r = s.n > 50 ? s.v.x : s.v; o.out = r }";
		expect(liftRecordSelect(src, "test")).toBe(src);
	});

	it("?? after an element read (a number fallback, not an address pick) is left untouched", () => {
		const src = "(s, i, o) => { const v = s.buf[9] ?? 0.5; o.out = v }";
		expect(liftRecordSelect(src, "test")).toBe(src);
	});

	it("a returned record literal chosen through a ternary lifts per field, no allocation", () => {
		expect(lift("return s.n > 50 ? { l: s.a, r: s.b } : { l: s.b, r: s.a }")).toBe(
			"(s, i, o) => { return { l: (s.n > 50) ? (s.a) : (s.b), r: (s.n > 50) ? (s.b) : (s.a) } }",
		);
	});

	it("a returned record literal names the first branch's key order even when the second branch orders them differently", () => {
		expect(lift("return s.n > 50 ? { l: s.a, r: s.b } : { r: s.a, l: s.b }")).toBe(
			"(s, i, o) => { return { l: (s.n > 50) ? (s.a) : (s.b), r: (s.n > 50) ? (s.b) : (s.a) } }",
		);
	});

	it("a returned plain ternary (no record literal branches) is left untouched", () => {
		const src = "(s, i, o) => { return s.n > 50 ? s.a.x : s.b.x }";
		expect(liftRecordSelect(src, "test")).toBe(src);
	});

	it("text with no address select is returned unchanged", () => {
		const src = "(s, i, o) => { o.out = s.x * 2; }";
		expect(liftRecordSelect(src, "test")).toBe(src);
	});
});
