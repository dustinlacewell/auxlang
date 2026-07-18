/**
 * The pattern-docs page (src/ui/pattern-docs/examples.ts) must never rot: every
 * example is a real core3 patch, so it must compile through the eval path and
 * render 2 s non-silent, bounded, and finite. Stochastic examples (?, degrade)
 * must additionally be deterministic — two renders bit-identical.
 */

import { render } from "@/core3/runtime/render";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { EXAMPLES } from "@/ui/pattern-docs/examples";
import { describe, expect, it } from "vitest";
import { allFinite, maxAbs, rms } from "./helpers";

const isStochastic = (code: string): boolean => code.includes("degrade") || /\?/.test(code);

describe("pattern-docs examples", () => {
	for (const ex of EXAMPLES) {
		it(`[${ex.section}] '${ex.title}' compiles and renders 2 s non-silent, bounded, finite`, () => {
			const { l, r } = render(evalPatch(ex.code), 2);
			expect(allFinite(l)).toBe(true);
			expect(allFinite(r)).toBe(true);
			expect(rms(l)).toBeGreaterThan(0.005);
			expect(maxAbs(l)).toBeLessThan(2);
			expect(maxAbs(r)).toBeLessThan(2);
		});
	}

	for (const ex of EXAMPLES.filter((e) => isStochastic(e.code))) {
		it(`[${ex.section}] '${ex.title}' is deterministic across two renders`, () => {
			const program = evalPatch(ex.code);
			const first = render(program, 2);
			const second = render(program, 2);
			expect(second.l).toEqual(first.l);
			expect(second.r).toEqual(first.r);
		});
	}
});
