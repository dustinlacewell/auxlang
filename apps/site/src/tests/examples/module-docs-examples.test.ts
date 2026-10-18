/**
 * The module-docs page (src/ui/module-docs/examples.ts) must never rot: every
 * example is a real patch, so it must compile through the eval path and
 * render 2 s non-silent, bounded, and finite.
 */

import { render } from "auxlang/runtime/render";
import { evalPatch } from "auxlang/eval-patch";
import { EXAMPLES } from "@/ui/module-docs/examples/examples";
import { describe, expect, it } from "vitest";
import { allFinite, maxAbs, rms } from "auxlang/testing/bridge-helpers";

describe("module-docs examples", () => {
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
});
