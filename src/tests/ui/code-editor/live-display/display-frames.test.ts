/**
 * `readDisplays` (display-frames.ts) against a synthetic monitor frame's
 * third section: two displays, the second with 2 lanes.
 */

import { describe, expect, it } from "vitest";

import { readDisplays } from "@/ui/code-editor/live-display/display-frames";
import type { DisplayWatch } from "@/core3/runtime/live/live-contract";
import { frameWords } from "@/core3/runtime/live/monitor-region";

const LEVEL_COUNT = 1;

function buildWords(displays: readonly DisplayWatch[], laneValues: Map<string, number[]>): Float64Array {
	let total = frameWords(LEVEL_COUNT);
	for (const d of displays) for (let lane = 0; lane < d.lanes; lane++) {
		const n = (laneValues.get(`${d.site}:${lane}`) as number[]).length;
		total += 2 + n;
	}
	const words = new Float64Array(total);
	let at = frameWords(LEVEL_COUNT);
	for (const d of displays) {
		for (let lane = 0; lane < d.lanes; lane++) {
			const floats = laneValues.get(`${d.site}:${lane}`) as number[];
			words[at] = 3; // head
			words[at + 1] = floats.length;
			for (let k = 0; k < floats.length; k++) words[at + 2 + k] = floats[k] as number;
			at += 2 + floats.length;
		}
	}
	return words;
}

function display(site: number, lanes: number): DisplayWatch {
	return { node: site, site, module: "scope", kind: "wave", lanes, config: {} };
}

describe("readDisplays", () => {
	it("copies two displays (one with 2 lanes) into the right per-site, per-lane arrays", () => {
		const displays = [display(10, 1), display(20, 2)];
		const laneValues = new Map<string, number[]>([
			["10:0", [1, 2, 3]],
			["20:0", [4, 5]],
			["20:1", [6, 7, 8, 9]],
		]);
		const words = buildWords(displays, laneValues);

		const into = new Map<number, Float64Array[]>();
		readDisplays(words, LEVEL_COUNT, displays, into);

		expect([...(into.get(10)?.[0] as Float64Array)]).toEqual([3, 3, 1, 2, 3]);
		expect([...(into.get(20)?.[0] as Float64Array)]).toEqual([3, 2, 4, 5]);
		expect([...(into.get(20)?.[1] as Float64Array)]).toEqual([3, 4, 6, 7, 8, 9]);
	});

	it("a second call with the same shapes reuses the same arrays (no reallocation)", () => {
		const displays = [display(10, 1), display(20, 2)];
		const laneValues = new Map<string, number[]>([
			["10:0", [1, 2, 3]],
			["20:0", [4, 5]],
			["20:1", [6, 7, 8, 9]],
		]);
		const words1 = buildWords(displays, laneValues);
		const into = new Map<number, Float64Array[]>();
		readDisplays(words1, LEVEL_COUNT, displays, into);
		const buf10 = into.get(10)?.[0];
		const buf20a = into.get(20)?.[0];
		const buf20b = into.get(20)?.[1];

		const laneValues2 = new Map<string, number[]>([
			["10:0", [9, 8, 7]],
			["20:0", [1, 1]],
			["20:1", [2, 2, 2, 2]],
		]);
		const words2 = buildWords(displays, laneValues2);
		readDisplays(words2, LEVEL_COUNT, displays, into);

		expect(into.get(10)?.[0]).toBe(buf10);
		expect(into.get(20)?.[0]).toBe(buf20a);
		expect(into.get(20)?.[1]).toBe(buf20b);
		expect([...(into.get(10)?.[0] as Float64Array)]).toEqual([3, 3, 9, 8, 7]);
	});
});
