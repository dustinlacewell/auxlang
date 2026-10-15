/**
 * The built-in library obeys the tick subset like any patch module: every
 * registered module outside the exempt list carries its source text, and that
 * text passes the checker.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { getRegistry } from "@/core3/module/define";
import { checkModule } from "@/core3/module/tick-subset/check-module";
import { EXEMPT_MODULES } from "@/core3/module/tick-subset/exempt";

const checked = [...getRegistry().values()].filter((spec) => !EXEMPT_MODULES.has(spec.name));

describe("built-in library", () => {
	it("has modules outside the exempt list", () => {
		expect(checked.length).toBeGreaterThan(0);
	});

	it.each(checked.map((spec) => [spec.name, spec] as const))(
		"%s passes the tick subset",
		(_name, spec) => {
			const source = spec.source;
			expect(source).toBeDefined();
			if (source !== undefined) expect(() => checkModule(spec, source)).not.toThrow();
		},
	);

	it("exempt modules run their host tick and carry no source", () => {
		for (const name of EXEMPT_MODULES) {
			expect(getRegistry().get(name)?.source).toBeUndefined();
		}
	});
});
