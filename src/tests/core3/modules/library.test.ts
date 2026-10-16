/**
 * The built-in library obeys the tick subset like any patch module: every
 * registered module carries its source text, and that text passes the
 * checker. A library module's tick is read on first use, not at import, so
 * this is where a fault in it shows.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { getRegistry } from "@/core3/module/define";
import { specIR } from "@/core3/module/front/module/spec-ir";

const modules = [...getRegistry().values()];

describe("built-in library", () => {
	it("includes the bridge modules", () => {
		for (const name of ["clock", "counter", "seq"]) expect(getRegistry().has(name)).toBe(true);
	});

	it.each(modules.map((spec) => [spec.name, spec] as const))(
		"%s passes the tick subset",
		(_name, spec) => {
			expect(spec.source).toBeDefined();
			expect(() => specIR(spec)).not.toThrow();
		},
	);
});
