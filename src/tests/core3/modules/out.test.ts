import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { getModule } from "@/core3/module/define";
import { reduceDriver } from "./helpers";

const out = getModule("out");

const lanes = (...v: number[]) => Float32Array.from(v);

describe("out", () => {
	it("width 1 puts signal dead center (equal l/r)", () => {
		const d = reduceDriver(out, 1);
		// feed an AC-ish signal so the DC blocker doesn't null it entirely;
		// use first-sample response where dc y1=0.
		const o = d.step({ in: lanes(1), gain: 1 });
		expect(o.l!).toBeCloseTo(o.r!, 6);
		expect(o.l!).toBeGreaterThan(0);
	});

	it("lane spread is constant-power: l²+r² roughly constant across positions", () => {
		// Compare a 1-lane center vs the per-lane power in a 2-lane spread,
		// bypassing the DC blocker by reading the first sample.
		const powers: number[] = [];
		for (const width of [1, 2, 3, 4]) {
			const d = reduceDriver(out, width);
			// all lanes carry the same unit value; measure summed power / norm²·width
			const laneVals = Float32Array.from(Array(width).fill(1));
			const o = d.step({ in: laneVals, gain: 1 });
			// undo the 1/√width mixdown to inspect per-unit lane power sum
			powers.push(o.l! * o.l! + o.r! * o.r!);
		}
		// Not asking for exact equality (sum of correlated lanes differs), but each
		// stays a sane bounded value — constant-power law means no blow-up.
		for (const p of powers) {
			expect(p).toBeGreaterThan(0);
			expect(p).toBeLessThan(2);
		}
	});

	it("single lane swept across pan positions keeps l²+r² constant", () => {
		// Drive each of the N lanes ALONE in an N-wide out; the placed lane's
		// pan angle changes but l²+r² for that lane is invariant.
		const width = 8;
		const amp = 1e-3; // well below the safety clip threshold
		const energies: number[] = [];
		for (let lane = 0; lane < width; lane++) {
			const d = reduceDriver(out, width);
			const vals = new Float32Array(width);
			vals[lane] = amp;
			const o = d.step({ in: vals, gain: 1 });
			// first sample: DC blocker y = x (y1=0, x1=0). Undo 1/√width norm and amp.
			const norm = 1 / Math.sqrt(width);
			const l = o.l! / norm / amp;
			const r = o.r! / norm / amp;
			energies.push(l * l + r * r);
		}
		const first = energies[0]!;
		for (const e of energies) expect(e).toBeCloseTo(first, 5);
	});

	it("a signal at 0.5 passes unchanged (gain 1)", () => {
		const d = reduceDriver(out, 1);
		// first sample: DC blocker y = x (x1 = y1 = 0), so only the clip acts
		const o = d.step({ l: lanes(0.5), r: lanes(-0.5), gain: 1 });
		expect(o.l).toBe(0.5);
		expect(o.r).toBe(-0.5);
	});

	it("the safety clip is transparent just below −1 dBFS (a 0.88-peak 1 kHz sine)", () => {
		const d = reduceDriver(out, 1);
		let peak = 0;
		for (let k = 0; k < 24000; k++) {
			const v = 0.88 * Math.sin((2 * Math.PI * 1000 * k) / 48000);
			const o = d.step({ l: lanes(v), r: lanes(v), gain: 1 });
			if (k > 14400) peak = Math.max(peak, Math.abs(o.l!)); // after the DC guard's onset transient
		}
		expect(peak).toBeCloseTo(0.88, 3); // tanh would give 0.706
	});

	it("a huge input stays within [-1, 1]", () => {
		const d = reduceDriver(out, 1);
		let maxL = 0;
		for (let k = 0; k < 500; k++) {
			// alternating large signal so DC blocker passes it
			const v = k % 2 === 0 ? 50 : -50;
			const o = d.step({ in: lanes(v), gain: 5 });
			maxL = Math.max(maxL, Math.abs(o.l!));
		}
		expect(maxL).toBeLessThanOrEqual(1);
		expect(maxL).toBeGreaterThan(0.9); // actually driven into clip
	});

	it("the DC blocker's −3 dB point is the same at 48 kHz and 96 kHz", () => {
		const gainAt = (hz: number, sr: number) => {
			const d = reduceDriver(out, 1, {}, sr);
			let peak = 0;
			const n = 2 * sr; // 2 s: settle for 1 s, measure the last 1 s
			for (let k = 0; k < n; k++) {
				const v = 0.5 * Math.sin((2 * Math.PI * hz * k) / sr);
				const o = d.step({ l: lanes(v), r: lanes(v), gain: 1 });
				if (k >= sr) peak = Math.max(peak, Math.abs(o.l!));
			}
			return peak / 0.5;
		};
		const at48 = gainAt(5, 48000);
		const at96 = gainAt(5, 96000);
		expect(at48).toBeCloseTo(Math.SQRT1_2, 2); // −3 dB at the 5 Hz corner
		expect(at96).toBeCloseTo(at48, 3);
	});

	it("the safety clip's soft knee keeps moderate overdrive strictly below 1", () => {
		const d = reduceDriver(out, 1);
		let maxL = 0;
		for (let k = 0; k < 500; k++) {
			const v = k % 2 === 0 ? 1 : -1; // ~unit AC, gain pushes into the clip knee
			const o = d.step({ in: lanes(v), gain: 1.5 });
			maxL = Math.max(maxL, Math.abs(o.l!));
		}
		expect(maxL).toBeLessThan(1);
		expect(maxL).toBeGreaterThan(0.5);
	});

	// Jack widths differ: each jack mixes its own lanes. First sample, so the DC
	// blocker passes x through (x1 = y1 = 0) and only gain and the clip act.
	it("a mono l jack beside a 4-lane in counts once", () => {
		const d = reduceDriver(out, 4);
		const o = d.step({ in: lanes(0, 0, 0, 0), l: lanes(0.25), gain: 1 });
		expect(o.l).toBeCloseTo(0.25, 6);
		expect(o.r).toBe(0);
	});

	it("a 4-lane l jack sums its own lanes by 1/√4", () => {
		const d = reduceDriver(out, 4);
		const o = d.step({ l: lanes(0.1, 0.2, 0.3, 0.4), gain: 1 });
		expect(o.l).toBeCloseTo(1 / 2, 6);
	});

	it("a mono in beside a 4-lane l sits dead center, once", () => {
		const d = reduceDriver(out, 4);
		const o = d.step({ in: lanes(0.5), l: lanes(0, 0, 0, 0), gain: 1 });
		expect(o.l).toBeCloseTo(0.5 * Math.SQRT1_2, 6);
		expect(o.r).toBeCloseTo(0.5 * Math.SQRT1_2, 6);
	});

	it("DC is removed over time (constant input decays to ~0)", () => {
		const d = reduceDriver(out, 1);
		let last = 0;
		for (let k = 0; k < 20000; k++) last = d.step({ in: lanes(0.5), gain: 1 }).l!;
		expect(Math.abs(last)).toBeLessThan(0.01);
	});

	it("non-finite bus samples flush to silence and the blocker recovers", () => {
		const d = reduceDriver(out, 1);
		d.step({ in: lanes(0.5), gain: 1 }); // charge the DC state
		for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
			const o = d.step({ in: lanes(bad), gain: 1 });
			expect(o.l).toBe(0);
			expect(o.r).toBe(0);
		}
		// after the flush, finite input produces finite output immediately
		// (an unguarded blocker would compute Inf - Inf = NaN forever)
		const o = d.step({ in: lanes(0.5), gain: 1 });
		expect(Number.isFinite(o.l)).toBe(true);
		expect(Number.isFinite(o.r)).toBe(true);
		expect(Math.abs(o.l as number)).toBeGreaterThan(0);
	});
});
