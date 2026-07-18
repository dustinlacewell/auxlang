/**
 * The module-docs page (src/ui/module-docs/examples.ts) must never rot: every
 * example is a real core3 patch, so it must compile through the eval path and
 * render 2 s non-silent, bounded, and finite.
 */

import "@/core3/modules/all";

import * as api from "@/core3/api";
import { compile, runEval } from "@/core3/api";
import type { Program } from "@/core3/api";
import { render } from "@/core3/runtime/render";
import { EXAMPLES } from "@/ui/module-docs/examples";
import { describe, expect, it } from "vitest";
import { allFinite, maxAbs, rms } from "./helpers";

const API_NAMES = Object.keys(api);
const API_VALUES = API_NAMES.map((n) => (api as Record<string, unknown>)[n]);

function evalPatch(source: string): Program {
	const patch = new Function(...API_NAMES, source) as (...a: unknown[]) => void;
	return compile(runEval(() => patch(...API_VALUES)));
}

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
