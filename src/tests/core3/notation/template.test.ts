import { describe, expect, it } from "vitest";

import type { Pat } from "@/core3/pattern/ast";
import { p } from "@/core3/pattern/notation/template";
import { toP } from "@/core3/pattern/pat-class";
import { r } from "@/core3/pattern/rational";

const pure = (value: number): Pat => ({ op: "pure", value });
const w = (pat: Pat, n = 1, d = 1) => ({ pat, weight: r(n, d) });
const fastcat = (...children: { pat: Pat; weight: ReturnType<typeof r> }[]): Pat => ({ op: "fastcat", children });
const silence = (): Pat => ({ op: "silence" });

const c4 = 60;
const e4 = 64;
const g4 = 67;

describe("p tagged template splicing", () => {
	it("no interpolation parses like parse()", () => {
		expect(p`c4 e4`.ast).toEqual(fastcat(w(pure(c4)), w(pure(e4))));
	});

	it("splices a number", () => {
		expect(p`c4 ${67}`.ast).toEqual(fastcat(w(pure(c4)), w(pure(67))));
	});

	it("splices a note string", () => {
		expect(p`c4 ${"g4"}`.ast).toEqual(fastcat(w(pure(c4)), w(pure(g4))));
	});

	it("splices a full mini-notation fragment string", () => {
		expect(p`${"[c4 e4]"}`.ast).toEqual(fastcat(w(pure(c4)), w(pure(e4))));
	});

	it("splices a P (pattern-in-pattern)", () => {
		const hook = toP(fastcat(w(pure(c4)), w(pure(e4))));
		expect(p`${hook} ~`.ast).toEqual(fastcat(w(hook.ast), w(silence())));
	});

	it("splices an array as a fastcat group", () => {
		expect(p`${[c4, e4, g4]}`.ast).toEqual(fastcat(w(pure(c4)), w(pure(e4)), w(pure(g4))));
	});

	it("splices a nested-array with mixed types", () => {
		const hook = toP(pure(c4));
		expect(p`${[hook, "e4", 67]}`.ast).toEqual(fastcat(w(pure(c4)), w(pure(e4)), w(pure(g4))));
	});

	it("interpolation mixes with literal text and modifiers", () => {
		const hook = toP(pure(c4));
		// ${hook}*2  -> fast(2, hook)
		expect(p`${hook}*2`.ast).toEqual({ op: "fast", factor: r(2), child: pure(c4) });
	});
});
