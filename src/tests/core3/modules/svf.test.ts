import { describe, expect, it } from "vitest";

import { bpf, hpf, lpf, notch } from "@/core3/modules/svf";
import { SR, driver, rms } from "./helpers";

/** Feed a constant (DC) and read the settled output. */
function dcResponse(spec: typeof lpf, cutoff: number): number {
	const d = driver(spec);
	return d.run(4000, { in: 1, cutoff }).out!;
}

/** RMS gain at a given input frequency by driving a sine directly. */
function sineGain(spec: typeof lpf, freqHz: number, cutoff: number, res = 0.2): number {
	const d = driver(spec);
	const w = (2 * Math.PI * freqHz) / SR;
	const n = 8000;
	const out: number[] = [];
	for (let k = 0; k < n; k++) {
		const x = Math.sin(w * k);
		out.push(d.step({ in: x, cutoff, res }).out!);
	}
	// discard the first half (settling)
	const settled = out.slice(n / 2);
	return (
		rms(settled) / rms(Array.from({ length: settled.length }, (_, k) => Math.sin(w * (n / 2 + k))))
	);
}

describe("svf", () => {
	it("lpf passes DC (~1.0)", () => {
		expect(dcResponse(lpf, 1000)).toBeCloseTo(1.0, 2);
	});

	it("lpf attenuates near-Nyquist", () => {
		const g = sineGain(lpf, SR * 0.4, 1000);
		expect(g).toBeLessThan(0.1);
	});

	it("hpf blocks DC (~0)", () => {
		expect(Math.abs(dcResponse(hpf, 1000))).toBeLessThan(0.01);
	});

	it("hpf passes near-Nyquist (inverse of lpf)", () => {
		const g = sineGain(hpf, SR * 0.4, 1000);
		expect(g).toBeGreaterThan(0.8);
	});

	it("bpf peaks near its cutoff", () => {
		const cutoff = 2000;
		const atCut = sineGain(bpf, cutoff, cutoff, 0.2);
		const below = sineGain(bpf, cutoff / 8, cutoff, 0.2);
		const above = sineGain(bpf, cutoff * 8, cutoff, 0.2);
		expect(atCut).toBeGreaterThan(below);
		expect(atCut).toBeGreaterThan(above);
	});

	it("bpf blocks DC", () => {
		expect(Math.abs(dcResponse(bpf, 1000))).toBeLessThan(0.01);
	});

	it("notch passes DC and near-Nyquist but dips at cutoff", () => {
		const cutoff = 2000;
		expect(dcResponse(notch, cutoff)).toBeCloseTo(1.0, 1);
		const atCut = sineGain(notch, cutoff, cutoff, 0.05);
		const below = sineGain(notch, cutoff / 8, cutoff, 0.05);
		expect(atCut).toBeLessThan(below);
	});

	it("shares one res→Q mapping (higher res → sharper bpf peak)", () => {
		const cutoff = 2000;
		const lowRes = sineGain(bpf, cutoff, cutoff, 0.1);
		const highRes = sineGain(bpf, cutoff, cutoff, 0.9);
		expect(highRes).toBeGreaterThan(lowRes);
	});
});
