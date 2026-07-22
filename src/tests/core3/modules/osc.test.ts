import { describe, expect, it } from "vitest";

import "@/core3/modules/osc";
import { getModule } from "@/core3/module/define";
import { SR, driver, maxAbs, periodFromCrossings } from "./helpers";

const sin = getModule("sin");
const saw = getModule("saw");
const tri = getModule("tri");
const sqr = getModule("sqr");

describe("osc", () => {
	it("pitch 69 → 440 Hz fundamental (period ≈ sr/440)", () => {
		const d = driver(sin);
		const xs = d.trace(SR, "out", { pitch: 69 });
		const period = periodFromCrossings(xs);
		expect(period).toBeCloseTo(SR / 440, 0); // within ~1 sample
	});

	it("pitch 81 (one octave up) → 880 Hz", () => {
		const d = driver(sin);
		const xs = d.trace(SR, "out", { pitch: 81 });
		expect(periodFromCrossings(xs)).toBeCloseTo(SR / 880, 0);
	});

	it("freq input overrides pitch when finite", () => {
		const d = driver(sin);
		// pitch 69 would be 440; freq 100 must win
		const xs = d.trace(SR, "out", { pitch: 69, freq: 100 });
		expect(periodFromCrossings(xs)).toBeCloseTo(SR / 100, -1);
	});

	it("falls back to pitch when freq is null (default)", () => {
		const d = driver(sin);
		const xs = d.trace(SR, "out", { pitch: 69 }); // freq default null
		expect(periodFromCrossings(xs)).toBeCloseTo(SR / 440, 0);
	});

	it("min/max range maps the waveform (100..800 LFO idiom)", () => {
		const d = driver(sin);
		const xs = d.trace(SR, "out", { freq: 100, min: 100, max: 800 });
		// sin fully sweeps [-1,1] → [100,800]
		expect(Math.min(...xs)).toBeCloseTo(100, 0);
		expect(Math.max(...xs)).toBeCloseTo(800, 0);
	});

	it("default output stays in [-1,1] for sin", () => {
		const d = driver(sin);
		const xs = d.trace(SR, "out", { freq: 220 });
		expect(maxAbs(xs)).toBeLessThanOrEqual(1.0 + 1e-9);
	});

	it("saw stays bounded (polyBLEP overshoot small)", () => {
		const d = driver(saw);
		const xs = d.trace(SR, "out", { freq: 220 });
		// naive saw is exactly [-1,1]; polyBLEP adds a small residual near the wrap.
		expect(maxAbs(xs)).toBeLessThan(1.3);
	});

	it("sqr stays bounded", () => {
		const d = driver(sqr);
		const xs = d.trace(SR, "out", { freq: 220 });
		expect(maxAbs(xs)).toBeLessThan(1.3);
	});

	it("tri is unit-amplitude with no DC offset", () => {
		const d = driver(tri);
		const xs = d.trace(SR, "out", { freq: 220 });
		// direct-from-phase triangle: exactly [-1,1], symmetric about 0
		expect(maxAbs(xs)).toBeLessThanOrEqual(1 + 1e-9);
		expect(Math.max(...xs)).toBeCloseTo(1, 2);
		expect(Math.min(...xs)).toBeCloseTo(-1, 2);
		const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
		expect(Math.abs(mean)).toBeLessThan(0.02);
	});

	it("polyBLEP smooths the saw wrap discontinuity vs a naive saw", () => {
		// Naive saw at freq f jumps by ~2 at the wrap in one sample.
		// Band-limited saw should have a smaller max sample-to-sample jump.
		const freq = 4000; // high freq: dt large, correction visible
		const d = driver(saw);
		const xs = d.trace(2000, "out", { freq });
		let maxJump = 0;
		for (let k = 1; k < xs.length; k++) {
			maxJump = Math.max(maxJump, Math.abs(xs[k]! - xs[k - 1]!));
		}
		// naive would jump ~2 at every wrap; band-limited noticeably less.
		expect(maxJump).toBeLessThan(1.9);
	});

	it("phase input sets initial phase", () => {
		const a = driver(sin);
		const b = driver(sin);
		const xa = a.trace(10, "out", { freq: 100, phase: 0 });
		const xb = b.trace(10, "out", { freq: 100, phase: 0.25 });
		// quarter-phase start on a sine → begins near peak (1), not 0
		expect(xa[0]!).toBeCloseTo(0, 2);
		expect(xb[0]!).toBeCloseTo(1, 1);
	});
});
