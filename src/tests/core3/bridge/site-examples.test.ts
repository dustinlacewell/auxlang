/**
 * The site's Examples menu must never rot. Each example (the single source in
 * src/ui/core3-editor/examples.ts, shared with the live editor) must compile
 * through the real eval path and render 2 s non-silent, bounded, and finite.
 */

import "@/core3/modules/all";

import * as api from "@/core3/api";
import { compile, runEval } from "@/core3/api";
import type { Program } from "@/core3/api";
import { render } from "@/core3/runtime/render";
import { EXAMPLES } from "@/ui/core3-editor/examples";
import { describe, expect, it } from "vitest";
import { allFinite, maxAbs, rms } from "./helpers";

const API_NAMES = Object.keys(api);
const API_VALUES = API_NAMES.map((n) => (api as Record<string, unknown>)[n]);

function evalPatch(source: string): Program {
	const patch = new Function(...API_NAMES, source) as (...a: unknown[]) => void;
	return compile(runEval(() => patch(...API_VALUES)));
}

describe("site examples", () => {
	for (const ex of EXAMPLES) {
		it(`'${ex.name}' compiles and renders 2 s non-silent, bounded, finite`, () => {
			const { l, r } = render(evalPatch(ex.source), 2);
			expect(allFinite(l)).toBe(true);
			expect(allFinite(r)).toBe(true);
			expect(rms(l)).toBeGreaterThan(0.01);
			expect(maxAbs(l)).toBeLessThan(2);
			expect(maxAbs(r)).toBeLessThan(2);
		});
	}
});
