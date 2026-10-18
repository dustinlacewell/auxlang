import { describe, expect, it } from "vitest";

import "@/library/all";
import { getModule } from "@/dsp/define";
import { driver } from "./helpers";

const clockmult = getModule("clockmult");

/** Single-sample input trigs every `period` samples, `count` of them; returns output trig sample indices. */
function fires(period: number, count: number, by?: number, tail = 0): number[] {
	const d = driver(clockmult);
	const at: number[] = [];
	for (let k = 0; k < period * count + tail; k++) {
		const trig = k % period === 0 && k < period * count ? 1 : 0;
		const o = d.step(by === undefined ? { trig } : { trig, by }).out!;
		if (o > 0.5) at.push(k);
	}
	return at;
}

describe("clockmult", () => {
	it("passes each trig alone until two trigs give it a period", () => {
		expect(fires(100, 1, 4, 300)).toEqual([0]);
	});

	it("locks after two trigs: by evenly spaced trigs per input period", () => {
		expect(fires(100, 3, 4, 100)).toEqual([0, 100, 125, 150, 175, 200, 225, 250, 275]);
	});

	it("defaults to by 2", () => {
		expect(fires(100, 3)).toEqual([0, 100, 150, 200, 250]);
	});

	it("by 1 passes the input; below 1 counts as 1", () => {
		expect(fires(100, 3, 1, 100)).toEqual([0, 100, 200]);
		expect(fires(100, 3, 0, 100)).toEqual([0, 100, 200]);
	});

	it("a held gate fires once per rising edge", () => {
		const d = driver(clockmult);
		const outs = [1, 1, 1, 0, 1, 1].map((trig) => d.step({ trig, by: 1 }).out);
		expect(outs).toEqual([1, 0, 0, 0, 1, 0]);
	});

	it("an early input trig cuts the group short and re-measures", () => {
		const d = driver(clockmult);
		const at: number[] = [];
		const edges = new Set([0, 100, 140]);
		for (let k = 0; k < 200; k++) {
			if (d.step({ trig: edges.has(k) ? 1 : 0, by: 4 }).out! > 0.5) at.push(k);
		}
		// period 100 → subs at 125 (cut at 140), then period 40 → subs every 10
		expect(at).toEqual([0, 100, 125, 140, 150, 160, 170]);
	});
});
