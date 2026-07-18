import { describe, expect, it } from "vitest";

import { clock } from "@/core3/modules/clock";
import { SR, driver } from "./helpers";

describe("clock", () => {
	it("phase ramps by bpm/60/sr per sample", () => {
		const bpm = 120;
		const d = driver(clock);
		const inc = bpm / 60 / SR;
		const p1 = d.step({ bpm }).phase!;
		const p2 = d.step({ bpm }).phase!;
		expect(p1).toBeCloseTo(inc, 9);
		expect(p2 - p1).toBeCloseTo(inc, 9);
	});

	it("reaches 1 full beat after sr*60/bpm samples", () => {
		const bpm = 120; // 2 beats/sec → 1 beat every sr/2 samples
		const d = driver(clock);
		const samplesPerBeat = (60 / bpm) * SR;
		const xs = d.trace(Math.round(samplesPerBeat) + 1, "phase", { bpm });
		expect(xs[xs.length - 1]!).toBeCloseTo(1, 2);
	});

	it("trig is a single sample at each beat boundary", () => {
		const bpm = 120;
		const d = driver(clock);
		const samplesPerBeat = Math.round((60 / bpm) * SR);
		// trace just short of the 3rd beat's onset: trigs at beat 0,1,2 = 3.
		const trigs = d.trace(samplesPerBeat * 3 - 2, "trig", { bpm });
		const fireIdx = trigs.map((t, k) => (t > 0.5 ? k : -1)).filter((k) => k >= 0);
		// one trig per beat onset (first at sample 0)
		expect(fireIdx.length).toBe(3);
		// each trig is exactly one sample wide
		for (const k of fireIdx) {
			if (k + 1 < trigs.length) expect(trigs[k + 1]!).toBe(0);
		}
	});

	it("gate is 50% duty over a beat", () => {
		const bpm = 120;
		const d = driver(clock);
		const samplesPerBeat = Math.round((60 / bpm) * SR);
		const gates = d.trace(samplesPerBeat * 2, "gate", { bpm });
		const high = gates.filter((g) => g > 0.5).length;
		expect(high / gates.length).toBeCloseTo(0.5, 2);
	});
});
