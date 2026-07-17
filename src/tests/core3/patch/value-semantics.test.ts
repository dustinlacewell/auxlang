/**
 * Setter value semantics: `h.cutoff(x)` returns a new handle over a COPY; the
 * original handle's node is untouched. Two chains off one base diverge cleanly.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { mod, out, runProgram } from "@/core3/api";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

describe("setter value semantics", () => {
	it("copy-with-change leaves the original unchanged", () => {
		const program = runProgram(() => {
			const tlpf = mod("tlpf");
			const base = tlpf(1000); // cutoff = 1000 (positional)
			out(base); // original
			out(base.cutoff(500)); // divergent copy
		});

		const filters = program.nodes.filter((n) => n.module === "tlpf");
		expect(filters).toHaveLength(2);

		const cutoffs = filters.map((f) => (f.lanes[0]!.cutoff as { v: number }).v).sort((a, b) => a - b);
		expect(cutoffs).toEqual([500, 1000]);
	});
});
