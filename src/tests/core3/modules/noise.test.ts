import { describe, expect, it } from "vitest";

import "@/core3/modules/noise";
import { getModule } from "@/core3/module/define";
import { driver, maxAbs } from "./helpers";

const noise = getModule("noise");

describe("noise", () => {
	it("is deterministic for a given seed", () => {
		const a = driver(noise, { __seed: 7 }).trace(500, "out");
		const b = driver(noise, { __seed: 7 }).trace(500, "out");
		expect(a).toEqual(b);
	});

	it("differs across seeds", () => {
		const a = driver(noise, { __seed: 1 }).trace(500, "out");
		const b = driver(noise, { __seed: 2 }).trace(500, "out");
		expect(a).not.toEqual(b);
	});

	it("output is bounded in [min, max]", () => {
		const d = driver(noise, { __seed: 3 });
		const xs = d.trace(2000, "out", { min: -1, max: 1 });
		expect(maxAbs(xs)).toBeLessThanOrEqual(1);
	});

	it("min/max remap the uniform range", () => {
		const d = driver(noise, { __seed: 5 });
		const xs = d.trace(5000, "out", { min: 100, max: 200 });
		expect(Math.min(...xs)).toBeGreaterThanOrEqual(100);
		expect(Math.max(...xs)).toBeLessThanOrEqual(200);
		// covers a decent chunk of the range
		expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(80);
	});

	it("seed 0 does not collapse to a constant", () => {
		const xs = driver(noise, { __seed: 0 }).trace(200, "out");
		expect(new Set(xs).size).toBeGreaterThan(50);
	});

	it("has zero mean over many samples (roughly)", () => {
		const xs = driver(noise, { __seed: 9 }).trace(20000, "out", { min: -1, max: 1 });
		const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
		expect(Math.abs(mean)).toBeLessThan(0.05);
	});
});
