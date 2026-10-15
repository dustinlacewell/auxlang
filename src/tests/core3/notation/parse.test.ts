import { describe, expect, it } from "vitest";

import type { Layer, Pat } from "@/core3/pattern/ast";
import { parse } from "@/core3/pattern/notation/parse";
import { r } from "@/core3/pattern/rational";

// AST shorthand builders for expected shapes.
const pure = (value: number): Pat => ({ op: "pure", value });
const fastcat = (...children: Pat[]): Pat => ({ op: "fastcat", children });
const timecat = (...children: [number, Pat][]): Pat => ({
	op: "timecat",
	children: children.map(([weight, pat]) => ({ pat, weight: r(weight) })),
});
const slowcat = (...children: Pat[]): Pat => ({ op: "slowcat", children });
const stack = (...children: Pat[]): Pat => ({ op: "stack", children });
const layer = (steps: number, pat: Pat): Layer => ({ pat, steps: r(steps) });
const polymeter = (...layers: Layer[]): Pat => ({ op: "polymeter", layers });
const fast = (factor: ReturnType<typeof r>, child: Pat): Pat => ({ op: "fast", factor, child });
const slow = (factor: ReturnType<typeof r>, child: Pat): Pat => ({ op: "slow", factor, child });
const degrade = (prob: number, child: Pat): Pat => ({ op: "degrade", prob, child });
const euclid = (k: number, steps: number, rot: number, child: Pat): Pat => ({
	op: "euclid",
	k,
	steps,
	rot,
	child,
});
const rest = (): Pat => ({ op: "rest" });
const tie = (lanes: number): Pat => ({ op: "tie", lanes });
const slide = (child: Pat): Pat => ({ op: "slide", child });

// c4 = 60
const c4 = 60;
const e4 = 64;
const g4 = 67;
const a4 = 69;

describe("parse shapes (MANIFESTO §3.3)", () => {
	it("sequence within cycle -> fastcat", () => {
		expect(parse("c4 e4")).toEqual(fastcat(pure(c4), pure(e4)));
	});

	it("single step -> the step itself (unit weight)", () => {
		expect(parse("c4")).toEqual(pure(c4));
	});

	it("~ -> a rest step", () => {
		expect(parse("c4 ~ e4")).toEqual(fastcat(pure(c4), rest(), pure(e4)));
	});

	it("[a b] subgroup -> fastcat as one step", () => {
		expect(parse("c4 [e4 g4]")).toEqual(fastcat(pure(c4), fastcat(pure(e4), pure(g4))));
	});

	it("<a b> alternate per cycle -> slowcat", () => {
		expect(parse("<a4 b4>")).toEqual(slowcat(pure(a4), pure(71)));
	});

	it("[a, b] chord -> stack", () => {
		expect(parse("[c4, e4]")).toEqual(stack(pure(c4), pure(e4)));
	});

	it("[c4,e4,g4] three-voice chord", () => {
		expect(parse("[c4,e4,g4]")).toEqual(stack(pure(c4), pure(e4), pure(g4)));
	});

	it("{a b c, d e} -> polymeter, layers keep their written step counts", () => {
		expect(parse("{c4 e4 g4, a4 b4}")).toEqual(
			polymeter(
				layer(3, fastcat(pure(c4), pure(e4), pure(g4))),
				layer(2, fastcat(pure(a4), pure(71))),
			),
		);
	});

	it("{a, [b c]} -> a single-step layer is still one step", () => {
		expect(parse("{c4, [e4 g4]}")).toEqual(
			polymeter(layer(1, fastcat(pure(c4))), layer(1, fastcat(fastcat(pure(e4), pure(g4))))),
		);
	});

	it("a*2 fast within slot", () => {
		expect(parse("c4*2")).toEqual(fast(r(2), pure(c4)));
	});

	it("a/2 slow within slot", () => {
		expect(parse("c4/2")).toEqual(slow(r(2), pure(c4)));
	});

	it("a/3/2 rational factor", () => {
		expect(parse("c4/3/2")).toEqual(slow(r(3, 2), pure(c4)));
	});

	it("a*3/2 rational factor", () => {
		expect(parse("c4*3/2")).toEqual(fast(r(3, 2), pure(c4)));
	});

	it("a!2 duplicate step -> two steps", () => {
		expect(parse("c4!2")).toEqual(fastcat(pure(c4), pure(c4)));
	});

	it("a@2 weight 2 -> timecat", () => {
		expect(parse("c4@2 e4")).toEqual(timecat([2, pure(c4)], [1, pure(e4)]));
	});

	it("bare _ -> a tie step after the previous step", () => {
		expect(parse("c4 _ e4")).toEqual(fastcat(pure(c4), tie(1), pure(e4)));
	});

	it("_ after a chord ties every lane", () => {
		expect(parse("[c4, e4, g4] _")).toEqual(fastcat(stack(pure(c4), pure(e4), pure(g4)), tie(3)));
	});

	it("a_b -> fastcat[a, slide b] as one step", () => {
		// As the whole pattern, the slide chain is one step of unit weight, so the
		// enclosing single-step sequence unwraps to the fastcat itself.
		expect(parse("c4_e4")).toEqual(fastcat(pure(c4), slide(pure(e4))));
	});

	it("a_b as one step among several", () => {
		expect(parse("c4_e4 g4")).toEqual(fastcat(fastcat(pure(c4), slide(pure(e4))), pure(g4)));
	});

	it("a_b_c: every later term slides in", () => {
		expect(parse("c4_e4_g4")).toEqual(fastcat(pure(c4), slide(pure(e4)), slide(pure(g4))));
	});

	it("a? -> degrade(0.5)", () => {
		expect(parse("c4?")).toEqual(degrade(0.5, pure(c4)));
	});

	it("a?0.7 drop chance 0.7 -> degrade(0.7)", () => {
		expect(parse("c4?0.7")).toEqual(degrade(0.7, pure(c4)));
		expect(parse("c4?.25")).toEqual(degrade(0.25, pure(c4)));
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
		expect(parse("0 1 2")).toEqual(fastcat(pure(0), pure(1), pure(2)));
	});
	it("decimals", () => {
		expect(parse("0.5 .75")).toEqual(fastcat(pure(0.5), pure(0.75)));
	});
	it("negative numbers", () => {
		expect(parse("-3")).toEqual(pure(-3));
	});
});
