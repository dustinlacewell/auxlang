import { describe, expect, it } from "vitest";

import type { Pat } from "@/core3/pattern/ast";
import { parse } from "@/core3/pattern/notation/parse";
import { r } from "@/core3/pattern/rational";

// AST shorthand builders for expected shapes.
const pure = (value: number): Pat => ({ op: "pure", value });
const silence = (): Pat => ({ op: "silence" });
const w = (pat: Pat, n = 1, d = 1) => ({ pat, weight: r(n, d) });
const fastcat = (...children: { pat: Pat; weight: ReturnType<typeof r> }[]): Pat => ({ op: "fastcat", children });
const slowcat = (...children: Pat[]): Pat => ({ op: "slowcat", children });
const stack = (...children: Pat[]): Pat => ({ op: "stack", children });
const fast = (factor: ReturnType<typeof r>, child: Pat): Pat => ({ op: "fast", factor, child });
const degrade = (prob: number, child: Pat): Pat => ({ op: "degrade", prob, child });
const euclid = (k: number, steps: number, rot: number, child: Pat): Pat => ({ op: "euclid", k, steps, rot, child });
const tieNext = (child: Pat): Pat => ({ op: "tieNext", child });
const tiePrev = (child: Pat): Pat => ({ op: "tiePrev", child });

// c4 = 60
const c4 = 60;
const e4 = 64;
const g4 = 67;
const a4 = 69;

describe("desugaring table (platonic.md §3.2)", () => {
	it("sequence within cycle -> weighted fastcat", () => {
		expect(parse("c4 e4")).toEqual(fastcat(w(pure(c4)), w(pure(e4))));
	});

	it("single step -> the step itself (unit weight)", () => {
		expect(parse("c4")).toEqual(pure(c4));
	});

	it("~ rest -> silence", () => {
		expect(parse("c4 ~ e4")).toEqual(fastcat(w(pure(c4)), w(silence()), w(pure(e4))));
	});

	it("[a b] subgroup -> fastcat as one step", () => {
		expect(parse("c4 [e4 g4]")).toEqual(fastcat(w(pure(c4)), w(fastcat(w(pure(e4)), w(pure(g4))))));
	});

	it("<a b> alternate per cycle -> slowcat", () => {
		expect(parse("<a4 b4>")).toEqual(slowcat(pure(a4), pure(71)));
	});

	it("{a, b} stack -> stack", () => {
		expect(parse("{c4, e4}")).toEqual(stack(pure(c4), pure(e4)));
	});

	it("{c4,e4,g4} three-voice chord", () => {
		expect(parse("{c4,e4,g4}")).toEqual(stack(pure(c4), pure(e4), pure(g4)));
	});

	it("a*2 fast within slot", () => {
		expect(parse("c4*2")).toEqual(fast(r(2), pure(c4)));
	});

	it("a*3/2 rational factor", () => {
		expect(parse("c4*3/2")).toEqual(fast(r(3, 2), pure(c4)));
	});

	it("a!2 duplicate step -> two steps", () => {
		expect(parse("c4!2")).toEqual(fastcat(w(pure(c4)), w(pure(c4))));
	});

	it("a@2 weight 2", () => {
		expect(parse("c4@2 e4")).toEqual(fastcat(w(pure(c4), 2), w(pure(e4))));
	});

	it("bare _ extends previous step's weight by 1", () => {
		expect(parse("c4 _ e4")).toEqual(fastcat(w(pure(c4), 2), w(pure(e4))));
	});

	it("a_b tie -> fastcat[tieNext a, tiePrev b]", () => {
		// As the whole pattern, the tie chain is one step of unit weight, so the
		// enclosing single-step sequence unwraps to the tie fastcat itself.
		expect(parse("c4_e4")).toEqual(fastcat(w(tieNext(pure(c4))), w(tiePrev(pure(e4)))));
	});

	it("a_b tie as one step among several", () => {
		const tie = fastcat(w(tieNext(pure(c4))), w(tiePrev(pure(e4))));
		expect(parse("c4_e4 g4")).toEqual(fastcat(w(tie), w(pure(g4))));
	});

	it("a_b_c chain flags middles both ways", () => {
		expect(parse("c4_e4_g4")).toEqual(fastcat(w(tieNext(pure(c4))), w(tiePrev(tieNext(pure(e4)))), w(tiePrev(pure(g4)))));
	});

	it("a? -> degrade(0.5)", () => {
		expect(parse("c4?")).toEqual(degrade(0.5, pure(c4)));
	});

	it("a?.75 keep-prob 0.75 -> degrade(0.25)", () => {
		expect(parse("c4?.75")).toEqual(degrade(0.25, pure(c4)));
	});

	it("a(3,8) euclid", () => {
		expect(parse("c4(3,8)")).toEqual(euclid(3, 8, 0, pure(c4)));
	});

	it("a(3,8,2) euclid with rotation", () => {
		expect(parse("c4(3,8,2)")).toEqual(euclid(3, 8, 2, pure(c4)));
	});

	it("modifiers chain left-to-right: c4*2? = degrade(fast(c4))", () => {
		expect(parse("c4*2?")).toEqual(degrade(0.5, fast(r(2), pure(c4))));
	});
});

describe("bare numbers are numeric values", () => {
	it("integers", () => {
		expect(parse("0 1 2")).toEqual(fastcat(w(pure(0)), w(pure(1)), w(pure(2))));
	});
	it("decimals", () => {
		expect(parse("0.5 .75")).toEqual(fastcat(w(pure(0.5)), w(pure(0.75))));
	});
	it("negative numbers", () => {
		expect(parse("-3")).toEqual(pure(-3));
	});
});
