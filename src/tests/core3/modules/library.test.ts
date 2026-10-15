/**
 * The built-in library obeys the tick subset like any patch module: every
 * registered module carries its source text, and that text passes the
 * checker.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { getRegistry } from "@/core3/module/define";
import { checkModule } from "@/core3/module/tick-subset/check-module";

const modules = [...getRegistry().values()];

describe("built-in library", () => {
	it("includes the bridge modules", () => {
		for (const name of ["clock", "counter", "seq"]) expect(getRegistry().has(name)).toBe(true);
	});

	it.each(modules.map((spec) => [spec.name, spec] as const))(
		"%s passes the tick subset",
		(_name, spec) => {
			const source = spec.source;
			expect(source).toBeDefined();
			if (source !== undefined) expect(() => checkModule(spec, source)).not.toThrow();
		},
	);
});
