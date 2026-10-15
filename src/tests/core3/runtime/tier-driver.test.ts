/**
 * The tier-up driver's wiring, with recording fakes: phase 1 renders alone
 * for `startAfter` blocks, then each block also advances phase 2's build
 * with the budget; the block after the build is done, phase 2 renders, on
 * the engine's own buffers and count.
 */

import type { Driver, ValueBuffers } from "@/core3/runtime/driver";
import { tierDriver } from "@/core3/runtime/tier/tier-driver";
import { describe, expect, it } from "vitest";

describe("tierDriver", () => {
	const log: string[] = [];
	const counts: number[] = [];
	const bufs: ValueBuffers = { cur: new Float64Array(1), prv: new Float64Array(1) };
	const seen: ValueBuffers[] = [];
	const recorder =
		(who: string): Driver =>
		(b, _l, _r, _offset, n, count) => {
			log.push(`${who}:${n}`);
			counts.push(count);
			seen.push(b);
		};
	let steps = 3;
	const driver = tierDriver(
		recorder("phase1"),
		{
			advance(budget) {
				log.push(`build:${budget}`);
				steps--;
				return steps === 0;
			},
			driver: () => recorder("phase2"),
		},
		{ startAfter: 2, budget: 7, rounds: [1] },
	);
	const out = new Float32Array(128);
	let count = 0;
	for (let b = 0; b < 7; b++) {
		driver(bufs, out, out, 0, 128, count, 48000);
		count += 128;
	}

	it("renders phase 1 alone, then builds within the budget, then switches", () => {
		expect(log).toEqual([
			"phase1:128",
			"phase1:128",
			"phase1:128",
			"build:7",
			"phase1:128",
			"build:7",
			"phase1:128",
			"build:7",
			"phase2:128",
			"phase2:128",
		]);
	});

	it("both phases render on the engine's buffers and count", () => {
		expect(seen.every((b) => b === bufs)).toBe(true);
		expect(counts).toEqual([0, 128, 256, 384, 512, 640, 768]);
	});
});
