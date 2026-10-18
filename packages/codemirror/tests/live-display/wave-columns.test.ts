import { describe, expect, it } from "vitest";

import { waveColumns } from "@/live-display/wave-columns";

const BUCKETS = 512;

/** One lane's words [head, n, buf] with trace 0's bucket b = (lo(b), hi(b)). */
function lane(lo: (b: number) => number, hi: (b: number) => number): Float64Array {
	const n = 8 * BUCKETS * 2;
	const words = new Float64Array(2 + n);
	words[1] = n;
	for (let b = 0; b < BUCKETS; b++) {
		words[2 + b * 2] = lo(b);
		words[2 + b * 2 + 1] = hi(b);
	}
	return words;
}

function columns(cols: number) {
	return { lo: new Float32Array(cols), hi: new Float32Array(cols) };
}

describe("waveColumns", () => {
	it("a column over several buckets takes their min and max", () => {
		const words = lane(
			(b) => -b,
			(b) => b,
		);
		const into = columns(64);
		waveColumns(words, 0, 0, 256, 64, into);
		expect(into.lo[1]).toBe(-7);
		expect(into.hi[1]).toBe(7);
	});

	it("a column between buckets interpolates them", () => {
		const words = lane(
			(b) => b,
			(b) => b,
		);
		const into = columns(511);
		waveColumns(words, 0, 0, 256, 511, into);
		expect(into.hi[1]).toBeCloseTo(0.5);
		expect(into.hi[510]).toBeCloseTo(255);
	});

	it("a step edge joins its neighbours, leaving no gap", () => {
		const words = lane(
			(b) => (b < 128 ? 0 : 1),
			(b) => (b < 128 ? 0 : 1),
		);
		const into = columns(256);
		waveColumns(words, 0, 0, 256, 256, into);
		for (let c = 1; c < 256; c++) {
			expect(into.lo[c]).toBeLessThanOrEqual(into.hi[c - 1] as number);
			expect(into.hi[c]).toBeGreaterThanOrEqual(into.lo[c - 1] as number);
		}
	});

	it("reads the ring from its start bucket", () => {
		const words = lane(
			(b) => b,
			(b) => b,
		);
		const into = columns(256);
		waveColumns(words, 0, 500, 256, 256, into);
		expect(into.lo[0]).toBe(500);
		expect(into.lo[12]).toBe(0);
	});
});
