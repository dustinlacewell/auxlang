import { describe, expect, it } from "vitest";

import type { Pat } from "@/pattern/ast";
import { p } from "@/pattern/notation/template";
import { toP } from "@/pattern/pat-class";
import { r } from "@/pattern/rational";

const pure = (value: number): Pat => ({ op: "pure", value });
const fastcat = (...children: Pat[]): Pat => ({ op: "fastcat", children });
const rest = (): Pat => ({ op: "rest" });

const c4 = 60;
const e4 = 64;
const g4 = 67;

describe("p tagged template splicing", () => {
	it("no interpolation parses like parse()", () => {
		expect(p`c4 e4`.ast).toEqual(fastcat(pure(c4), pure(e4)));
	});

	it("splices a number", () => {
		expect(p`c4 ${67}`.ast).toEqual(fastcat(pure(c4), pure(67)));
	});

	it("splices a note string", () => {
		expect(p`c4 ${"g4"}`.ast).toEqual(fastcat(pure(c4), pure(g4)));
	});

	it("splices a full mini-notation fragment string", () => {
		expect(p`${"[c4 e4]"}`.ast).toEqual(fastcat(pure(c4), pure(e4)));
	});

	it("splices a P (pattern-in-pattern)", () => {
		const hook = toP(fastcat(pure(c4), pure(e4)));
		expect(p`${hook} ~`.ast).toEqual(fastcat(hook.ast, rest()));
	});

	it("splices an array as a fastcat group", () => {
		expect(p`${[c4, e4, g4]}`.ast).toEqual(fastcat(pure(c4), pure(e4), pure(g4)));
	});

	it("splices a nested-array with mixed types", () => {
		const hook = toP(pure(c4));
		expect(p`${[hook, "e4", 67]}`.ast).toEqual(fastcat(pure(c4), pure(e4), pure(g4)));
	});

	it("interpolation mixes with literal text and modifiers", () => {
		const hook = toP(pure(c4));
		// ${hook}*2  -> fast(2, hook)
		expect(p`${hook}*2`.ast).toEqual({ op: "fast", factor: r(2), child: pure(c4) });
	});
});
