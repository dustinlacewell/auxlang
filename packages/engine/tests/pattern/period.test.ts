/** period: cycles until event times and kinds repeat, from structure alone. */

import { describe, expect, it } from "vitest";

import { p } from "@/pattern/notation/template";
import { P } from "@/pattern/pat-class";
import { period } from "@/pattern/period";

const of = (x: P) => period(x.ast);

describe("period", () => {
	it("is one cycle for a plain sequence", () => {
		expect(of(p`c e g`)).toBe(1);
		expect(of(p`c ~ e _`)).toBe(1);
	});

	it("counts alternation, nested alternations multiply out", () => {
		expect(of(p`<c e>`)).toBe(2);
		expect(of(p`<c e> <a b c>`)).toBe(6);
		expect(of(p`<c <e g>>`)).toBe(4);
	});

	it("scales with fast and slow, rounded up to whole cycles", () => {
		expect(of(p`c e`.slow(2))).toBe(2);
		expect(of(p`<c e>`.fast(2))).toBe(1);
		expect(of(p`c e`.slow(1.5))).toBe(3);
	});

	it("takes n from iter, every, and chunk", () => {
		expect(of(p`c e g b`.iter(4))).toBe(4);
		expect(of(p`c e`.every(3, (q) => q.rev()))).toBe(3);
	});

	it("keeps the period under degrade: randomness changes values, not times", () => {
		expect(of(p`c? e`)).toBe(1);
	});

	it("has none for compact over random rests", () => {
		expect(of(p`c? e`.compact())).toBeNull();
		expect(of(p`c ~ e`.compact())).toBe(1);
	});

	it("is the steps in one period after steps()", () => {
		expect(of(p`<c e> g a`.steps())).toBe(6);
	});
});
