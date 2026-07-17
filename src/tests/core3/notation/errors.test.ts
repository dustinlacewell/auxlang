import { describe, expect, it } from "vitest";

import { parse } from "@/core3/pattern/notation/parse";
import { p } from "@/core3/pattern/notation/template";

// Every malformed input must throw LOUDLY with a position. Nothing may
// parse-but-play-nothing — that is the bug class this parser kills.

describe("loud errors with position", () => {
	it("unknown character", () => {
		expect(() => parse("c4 % e4")).toThrow(/position 3/);
		expect(() => parse("c4 % e4")).toThrow(/unexpected character/);
	});

	it("unclosed [", () => {
		expect(() => parse("[c4 e4")).toThrow(/unclosed '\['/);
	});

	it("unclosed <", () => {
		expect(() => parse("<c4 e4")).toThrow(/unclosed '<'/);
	});

	it("unclosed {", () => {
		expect(() => parse("{c4, e4")).toThrow(/unclosed '\{'/);
	});

	it("unclosed ( in euclid", () => {
		expect(() => parse("c4(3,8")).toThrow(/unclosed '\('/);
	});

	it("dangling * with no factor", () => {
		expect(() => parse("c4*")).toThrow(/factor/);
	});

	it("dangling @ with no weight", () => {
		expect(() => parse("c4@")).toThrow(/factor/);
	});

	it("dangling ! with no count", () => {
		expect(() => parse("c4!")).toThrow(/count/);
	});

	it("dangling _ with no preceding step", () => {
		expect(() => parse("_ c4")).toThrow(/'_' with no preceding step/);
	});

	it("malformed probability out of range", () => {
		expect(() => parse("c4?2")).toThrow(/probability must be in \[0,1\]/);
	});

	it("empty pattern", () => {
		expect(() => parse("")).toThrow(/empty/);
		expect(() => parse("   ")).toThrow(/empty/);
	});

	it("empty subgroup", () => {
		expect(() => parse("[]")).toThrow(/empty/);
	});

	it("empty stack segment (trailing comma)", () => {
		expect(() => parse("{c4,}")).toThrow(/empty/);
	});

	it("invalid note letter", () => {
		expect(() => parse("h4")).toThrow(/invalid/);
	});

	it("euclid with non-integer pulses", () => {
		expect(() => parse("c4(3.5,8)")).toThrow(/integer/);
	});

	it("euclid missing steps", () => {
		expect(() => parse("c4(3)")).toThrow(/','|steps/);
	});

	it("trailing close bracket with no open", () => {
		expect(() => parse("c4 ]")).toThrow();
	});

	it("template: cannot splice object", () => {
		expect(() => p`${{ foo: 1 }}`).toThrow(/cannot splice/);
	});

	it("template: empty array interpolation", () => {
		expect(() => p`${[]}`).toThrow(/empty array/);
	});
});
