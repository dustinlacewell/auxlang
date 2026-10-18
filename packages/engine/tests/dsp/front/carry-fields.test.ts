import { describe, expect, it } from "vitest";

import { carryFields } from "@/dsp/front/state/carry-fields";
import { laneShapeOf } from "@/dsp/front/state/state-shape-of";

/** Picked fields, as both carries see them, sorted for a stable assertion. */
function picked(
	old: Record<string, unknown>,
	fresh: Record<string, unknown>,
	writes: readonly string[],
): readonly string[] | null {
	const fields = carryFields(laneShapeOf(old), laneShapeOf(fresh), writes);
	return fields === null ? null : [...fields].sort();
}

describe("carryFields", () => {
	describe("writes (shape C)", () => {
		it("carries only the written fields present in both", () => {
			expect(picked({ phase: 1, k: 2 }, { phase: 0, k: 0 }, ["phase"])).toEqual(["phase"]);
		});

		it("keeps a written field carrying when a new read-only field is added", () => {
			expect(picked({ phase: 1 }, { phase: 0, gain: 0.5 }, ["phase"])).toEqual(["phase"]);
		});

		it("does not include a read-only field even when present in both", () => {
			const fields = picked({ phase: 1, gain: 0.5 }, { phase: 0, gain: 0.25 }, ["phase"]);
			expect(fields).toEqual(["phase"]);
			expect(fields).not.toContain("gain");
		});

		it("starts the lane fresh when a written typed array resizes", () => {
			expect(
				picked({ buf: new Float64Array(64) }, { buf: new Float64Array(32) }, ["buf"]),
			).toBeNull();
		});

		it("starts the lane fresh when a written field changes kind", () => {
			expect(picked({ n: 1 }, { n: [0] }, ["n"])).toBeNull();
		});

		it("always includes __rng", () => {
			expect(picked({ phase: 1, __rng: { s: 9 } }, { phase: 0, __rng: { s: 0 } }, ["phase"])).toEqual(
				["__rng", "phase"],
			);
		});

		it("drops a written field only present on one side, keeping the rest", () => {
			expect(picked({ phase: 1, old: 2 }, { phase: 0, fresh: 3 }, ["phase", "old", "fresh"])).toEqual(
				["phase"],
			);
		});
	});
});
