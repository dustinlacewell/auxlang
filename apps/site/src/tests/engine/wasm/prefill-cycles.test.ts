/**
 * The cycle each table lane is prefilled for (wasm/host/prefill-cycles.ts):
 * 0 on a fresh start; on a hand-over, the source lane's cycle, the first
 * source cycle found for a lane with none, NaN when no source has one.
 */

import { prefillCycles } from "@/engine/wasm/host/prefill-cycles";
import { describe, expect, it } from "vitest";

const cycles = (sources: number[] | null, held: Record<string, number>) =>
	Array.from(
		prefillCycles(
			sources === null ? 3 : sources.length / 2,
			sources === null ? null : Int32Array.from(sources),
			(node, lane) => held[`${node}:${lane}`] ?? Number.NaN,
		),
	);

describe("prefillCycles", () => {
	it("starts every lane at cycle 0 on a fresh start", () => {
		expect(cycles(null, {})).toEqual([0, 0, 0]);
	});

	it("takes each lane's source cycle", () => {
		expect(cycles([0, 0, 2, 1], { "0:0": 5, "2:1": 7 })).toEqual([5, 7]);
	});

	it("gives a lane with no source, or a source with no table, the first source cycle", () => {
		expect(cycles([-1, -1, 3, 0, 4, 0], { "4:0": 9 })).toEqual([9, 9, 9]);
	});

	it("leaves every lane NaN when no source holds a cycle", () => {
		expect(cycles([-1, -1, 3, 0], {})).toEqual([Number.NaN, Number.NaN]);
	});
});
