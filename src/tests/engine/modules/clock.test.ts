import { describe, expect, it } from "vitest";

import "@/engine/modules/all";
import { getModule } from "@/engine/module/define";
import { SR, driver } from "./helpers";

const clock = getModule("clock");

const onesAt = (xs: number[]) => xs.map((x, k) => (x > 0.5 ? k : -1)).filter((k) => k >= 0);
const last = (xs: number[]) => xs[xs.length - 1] as number;

describe("clock", () => {
	it("position in bars ramps by bpm/60/sr/beatsPerBar per sample", () => {
		const bpm = 120;
		const d = driver(clock);
		const inc = bpm / 60 / SR / 4;
		const p1 = d.step({ bpm }).out as number;
		const p2 = d.step({ bpm }).out as number;
		expect(p1).toBeCloseTo(inc, 12);
		expect(p2 - p1).toBeCloseTo(inc, 12);
	});

	it("reaches one bar after four beats of 60/bpm seconds", () => {
		const d = driver(clock);
		expect(last(d.trace(4 * (SR / 2) + 1, "out", { bpm: 120 }))).toBeCloseTo(1, 4);
	});

	it("beatsPerBar sets the meter: a 3/4 bar is three beats", () => {
		const d = driver(clock, { beatsPerBar: 3 });
		expect(last(d.trace(3 * (SR / 2) + 1, "out", { bpm: 120 }))).toBeCloseTo(1, 4);
	});

	it("beat is a single-sample trig at each beat, bar at each bar", () => {
		const samplesPerBeat = SR / 2; // 120 bpm
		// just short of beat 9: beats 0..8 and bars 0..2
		const n = samplesPerBeat * 9 - 2;
		const beats = onesAt(driver(clock).trace(n, "beat", { bpm: 120 }));
		const bars = onesAt(driver(clock).trace(n, "bar", { bpm: 120 }));
		expect(beats.length).toBe(9);
		expect(bars.length).toBe(3);
		for (const k of bars) expect(beats).toContain(k);
		expect(bars[0]).toBe(0);
	});
});
