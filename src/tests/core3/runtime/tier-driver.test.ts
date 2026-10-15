/**
 * The tier-up driver's wiring, with recording fakes for its three drivers:
 * phase 1 renders until the selector switches, then phase 2; the shadow runs
 * its slices on its own copy of the buffers, with its own sample count, and
 * never touches the real output.
 */

import type { Driver, ValueBuffers } from "@/core3/runtime/driver";
import { tierDriver } from "@/core3/runtime/tier/tier-driver";
import { describe, expect, it } from "vitest";

interface Call {
	readonly who: string;
	readonly bufs: ValueBuffers;
	readonly out: Float32Array;
	readonly n: number;
	readonly count: number;
}

function recorder(calls: Call[], who: string): Driver {
	return (bufs, outL, _outR, _offset, n, count) => {
		bufs.cur[0] = (bufs.cur[0] as number) + n;
		calls.push({ who, bufs, out: outL, n, count });
	};
}

describe("tierDriver", () => {
	const calls: Call[] = [];
	const driver = tierDriver(
		{
			phase1: recorder(calls, "phase1"),
			phase2: recorder(calls, "phase2"),
			shadow: recorder(calls, "shadow"),
		},
		{ startAfter: 1, fraction: 1 / 2, warmSamples: 3 },
	);
	const bufs: ValueBuffers = { cur: new Float64Array(1), prv: new Float64Array(1) };
	const outL = new Float32Array(128);
	const outR = new Float32Array(128);
	let count = 0;
	for (const n of [128, 128, 128, 128, 128]) {
		driver(bufs, outL, outR, 0, n, count, 48000);
		count += n;
	}

	it("renders phase 1, shadows 1 then 2 samples, then switches to phase 2", () => {
		expect(calls.map((c) => `${c.who}:${c.n}`)).toEqual([
			"phase1:128",
			"phase1:128",
			"shadow:1",
			"phase1:128",
			"shadow:2",
			"phase2:128",
			"phase2:128",
		]);
	});

	it("the real drivers share the engine's buffers and count", () => {
		const real = calls.filter((c) => c.who !== "shadow");
		expect(real.every((c) => c.bufs === bufs && c.out === outL)).toBe(true);
		expect(real.map((c) => c.count)).toEqual([0, 128, 256, 384, 512]);
		expect(bufs.cur[0]).toBe(5 * 128);
	});

	it("the shadow runs on its own copy of the buffers from the first block, with its own count", () => {
		const shadow = calls.filter((c) => c.who === "shadow");
		expect(shadow.every((c) => c.bufs !== bufs && c.bufs === shadow[0]?.bufs)).toBe(true);
		expect(shadow.every((c) => c.out !== outL)).toBe(true);
		expect(shadow.map((c) => c.count)).toEqual([0, 1]);
		expect(shadow[0]?.bufs.cur[0]).toBe(3);
	});
});
