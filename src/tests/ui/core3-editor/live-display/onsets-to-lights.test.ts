import { onsetsToLights } from "@/ui/core3-editor/live-display/onsets-to-lights";
import type { SiteRanges } from "@/ui/core3-editor/live-display/site-ranges";
import { describe, expect, it } from "vitest";

/**
 * `c3 ~ e3 _` as four token sites: 0 c3 (atom), 1 ~ (rest, no onset ever),
 * 2 e3 (atom), 3 _ (extend, chained onto site 2).
 */
const siteRanges: SiteRanges = {
	rangeOf: (site) =>
		({ 0: { start: 0, end: 2 }, 1: { start: 3, end: 4 }, 2: { start: 5, end: 7 }, 3: { start: 8, end: 9 } })[
			site
		],
	extendersOf: (site) => (site === 2 ? [3] : []),
};

describe("onsetsToLights", () => {
	it("lights c3 then e3 (with its extend chain); the rest never lights", () => {
		const onsets = [
			{ watch: 0, lane: 0, kind: "on" as const, site: 0, frame: 0 },
			{ watch: 0, lane: 0, kind: "off" as const, site: 0, frame: 500 },
			{ watch: 0, lane: 0, kind: "on" as const, site: 2, frame: 1000 },
		];

		const atC3 = onsetsToLights(onsets, siteRanges, 250, 0);
		expect(atC3.has(0)).toBe(true);
		expect(atC3.has(1)).toBe(false);
		expect(atC3.has(2)).toBe(false);

		// c3's OFF has landed (the rest): dark before e3's ON.
		const duringRest = onsetsToLights(onsets, siteRanges, 750, 0);
		expect(duringRest.size).toBe(0);

		const atE3 = onsetsToLights(onsets, siteRanges, 1500, 0);
		expect(atE3.has(2)).toBe(true);
		expect(atE3.has(3)).toBe(true); // the tie/extend chain stays lit with its note
		expect(atE3.has(0)).toBe(false);
	});

	it("a light is not on before its audible frame", () => {
		const onsets = [{ watch: 0, lane: 0, kind: "on" as const, site: 2, frame: 1000 }];
		const before = onsetsToLights(onsets, siteRanges, 999, 0);
		expect(before.size).toBe(0);
		const after = onsetsToLights(onsets, siteRanges, 1000, 0);
		expect(after.has(2)).toBe(true);
	});

	it("a chord's stacked notes light together, one per lane", () => {
		const onsets = [
			{ watch: 0, lane: 0, kind: "on" as const, site: 0, frame: 0 },
			{ watch: 0, lane: 1, kind: "on" as const, site: 2, frame: 0 },
		];
		const lit = onsetsToLights(onsets, siteRanges, 0, 0);
		expect(lit.has(0)).toBe(true);
		expect(lit.has(2)).toBe(true);
		expect(lit.has(3)).toBe(true); // lane 1's tie/extend chain
	});

	it("a chord shrinking to fewer notes: the dropped lanes go dark, the kept lane stays lit", () => {
		const onsets = [
			{ watch: 0, lane: 0, kind: "on" as const, site: 0, frame: 0 },
			{ watch: 0, lane: 1, kind: "on" as const, site: 2, frame: 0 },
			{ watch: 0, lane: 1, kind: "off" as const, site: 0, frame: 500 },
		];
		const lit = onsetsToLights(onsets, siteRanges, 750, 0);
		expect(lit.has(0)).toBe(true); // lane 0 still sounding
		expect(lit.has(2)).toBe(false); // lane 1 went dark
		expect(lit.has(3)).toBe(false);
	});
});
