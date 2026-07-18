import { describe, expect, it } from "vitest";

import { delay } from "@/core3/modules/delay";
import { SR, driver } from "./helpers";

describe("delay", () => {
	it("echoes an impulse at round(time*sr) samples (mix=1, no feedback)", () => {
		const time = 0.01;
		const expected = Math.round(time * SR);
		const d = driver(delay);
		const out: number[] = [];
		// one-sample impulse, then silence
		out.push(d.step({ in: 1, time, feedback: 0, mix: 1 }).out!);
		for (let k = 1; k < expected + 50; k++) {
			out.push(d.step({ in: 0, time, feedback: 0, mix: 1 }).out!);
		}
		// find the largest tap after sample 0
		let peakIdx = 1;
		for (let k = 2; k < out.length; k++) if (out[k]! > out[peakIdx]!) peakIdx = k;
		expect(peakIdx).toBeCloseTo(expected, 0);
		expect(out[peakIdx]!).toBeGreaterThan(0.5);
	});

	it("fractional time interpolates the read head across two samples", () => {
		// time chosen so readPos is exactly between samples → energy split
		const sr = 1000;
		const time = 0.0105; // 10.5 samples
		const d = driver(delay, {}, sr);
		const out: number[] = [];
		out.push(d.step({ in: 1, time, feedback: 0, mix: 1 }).out!);
		for (let k = 1; k < 20; k++) out.push(d.step({ in: 0, time, feedback: 0, mix: 1 }).out!);
		// taps at index 10 and 11 should both be ~0.5 (linear interp)
		expect(out[10]! + out[11]!).toBeCloseTo(1, 5);
		expect(out[10]!).toBeCloseTo(0.5, 1);
		expect(out[11]!).toBeCloseTo(0.5, 1);
	});

	it("feedback decays over successive echoes", () => {
		const time = 0.005;
		const step = Math.round(time * SR);
		const feedback = 0.5;
		const d = driver(delay);
		const out: number[] = [];
		out.push(d.step({ in: 1, time, feedback, mix: 1 }).out!);
		for (let k = 1; k < step * 4 + 10; k++) {
			out.push(d.step({ in: 0, time, feedback, mix: 1 }).out!);
		}
		const echo1 = out[step]!;
		const echo2 = out[step * 2]!;
		const echo3 = out[step * 3]!;
		expect(echo2).toBeLessThan(echo1);
		expect(echo3).toBeLessThan(echo2);
		expect(echo2 / echo1).toBeCloseTo(feedback, 1);
	});

	it("mix=0 is fully dry (no wet at all)", () => {
		const time = 0.005;
		const d = driver(delay);
		const dry = d.step({ in: 1, time, feedback: 0, mix: 0 }).out;
		expect(dry).toBeCloseTo(1, 6);
		const later = d.trace(Math.round(time * SR) + 20, "out", { in: 0, time, feedback: 0, mix: 0 });
		expect(Math.max(...later)).toBeCloseTo(0, 6);
	});
});
