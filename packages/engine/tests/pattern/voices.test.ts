/**
 * `p.voices(policy, n)` (§3.5): lanes per event under the packed policy, and
 * the loud errors around `n`.
 */

import { describe, expect, it } from "vitest";

import type { Pat } from "@/pattern/ast";
import { pure, stack } from "@/pattern/combinators";
import { laneOf } from "@/pattern/event";
import { p } from "@/pattern/notation/template";
import { width } from "@/pattern/widths";
import { queryCycles } from "./helpers";

/** [value, lane] per event, in query order. */
function lanes(pat: Pat, from: number, to: number): number[][] {
	return queryCycles(pat, from, to).map((ev) => [ev.value, laneOf(ev)]);
}

describe("packed", () => {
	const progression = p`<[c4,e4,g4] [a3,c4,f4] [g3,b3]>`.voices("packed");

	it("each chord fills lanes from 0 in stack order", () => {
		expect(lanes(progression.ast, 0, 1)).toEqual([
			[60, 0],
			[64, 1],
			[67, 2],
		]);
		expect(lanes(progression.ast, 1, 2)).toEqual([
			[57, 0],
			[60, 1],
			[65, 2],
		]);
		expect(lanes(progression.ast, 2, 3)).toEqual([
			[55, 0],
			[59, 1],
		]);
	});

	it("is the default policy, and n defaults to the structural width", () => {
		expect(p`[c4,e4,g4]`.voices().ast).toEqual(p`[c4,e4,g4]`.voices("packed", 3).ast);
		expect(width(progression.ast)).toBe(3);
	});

	it("an n above the structural width leaves the extra lanes free", () => {
		const wide = p`[c4,e4]`.voices("packed", 4);
		expect(width(wide.ast)).toBe(4);
		expect(lanes(wide.ast, 0, 1)).toEqual([
			[60, 0],
			[64, 1],
		]);
	});
});

describe("loud failure", () => {
	it("an n below the structural width is an error at eval", () => {
		expect(() => p`[c4,e4,g4]`.voices("packed", 2)).toThrow(/needs 3 lanes/);
	});

	it("an unknown policy names the available ones", () => {
		expect(() => p`c4`.voices("spread")).toThrow(/unknown policy 'spread'; available: packed/);
	});

	it("n must be a positive integer", () => {
		expect(() => p`c4`.voices("packed", 1.5)).toThrow(/positive integer/);
		expect(() => p`c4`.voices("packed", 0)).toThrow(/positive integer/);
	});

	it("an event past the last lane throws, never drops", () => {
		// Hand-built data skips the combinator's check; the query guard still holds.
		const broken: Pat = { op: "voices", policy: "packed", n: 1, child: stack([pure(1), pure(2)]) };
		expect(() => queryCycles(broken, 0, 1)).toThrow(/lane 1, but there are only 1 lanes/);
	});
});
