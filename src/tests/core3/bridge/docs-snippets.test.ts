/**
 * The doc snippets (docs/snippets.ts) — every runnable block in README.md,
 * MANIFESTO.md, and docs/user-guide.md — must never rot: each is a real core3
 * patch, so it must compile through the eval path and render 2 s finite and
 * bounded. `audible` snippets must additionally clear 0.005 RMS. This is the
 * same bar and the same eval path the pattern/module-docs tests use, so
 * headless-green implies the docs quote working code.
 */

import { render } from "@/core3/runtime/render";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it } from "vitest";
import { SNIPPETS } from "../../../../docs/snippets";
import { allFinite, maxAbs, rms } from "./helpers";

describe("docs snippets", () => {
	for (const snip of SNIPPETS) {
		it(`'${snip.id}' compiles and renders 2 s finite and bounded`, () => {
			const { l, r } = render(evalPatch(snip.code), 2);
			expect(allFinite(l)).toBe(true);
			expect(allFinite(r)).toBe(true);
			expect(maxAbs(l)).toBeLessThan(4.1);
			expect(maxAbs(r)).toBeLessThan(4.1);
			if (snip.audible) expect(rms(l)).toBeGreaterThan(0.005);
		});
	}
});
