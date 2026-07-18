import { describe, expect, it } from "vitest";

import { ad, adsr, ar } from "@/core3/modules/env";
import { SR, driver } from "./helpers";

describe("ad", () => {
	it("rises to 1 during attack then decays back to 0", () => {
		const d = driver(ad);
		const attack = 0.01;
		const decay = 0.05;
		// hold gate high; ad ignores duration, fires on rising edge
		const xs = d.trace(Math.round((attack + decay) * SR) + 200, "out", {
			gate: 1,
			attack,
			decay,
		});
		expect(Math.max(...xs)).toBeCloseTo(1, 2);
		expect(xs[xs.length - 1]!).toBeCloseTo(0, 3);
	});

	it("peak occurs near end of attack segment", () => {
		const d = driver(ad);
		const attack = 0.02;
		const xs = d.trace(Math.round(0.1 * SR), "out", { gate: 1, attack, decay: 0.05 });
		let peakIdx = 0;
		for (let k = 1; k < xs.length; k++) if (xs[k]! > xs[peakIdx]!) peakIdx = k;
		expect(peakIdx / SR).toBeCloseTo(attack, 2);
	});
});

describe("ar", () => {
	it("full gate cycle: attack, sustain at 1 while held, release to 0", () => {
		const d = driver(ar);
		const attack = 0.01;
		const release = 0.05;
		// attack + hold
		const held = d.trace(Math.round(0.05 * SR), "out", { gate: 1, attack, release });
		expect(held[held.length - 1]!).toBeCloseTo(1, 2);
		// drop gate → release
		const rel = d.trace(Math.round((release + 0.02) * SR), "out", { gate: 0, attack, release });
		expect(rel[rel.length - 1]!).toBeCloseTo(0, 3);
	});

	it("gate dropped DURING attack releases from the current (partial) level", () => {
		const d = driver(ar);
		const attack = 0.1; // long attack
		const release = 0.05;
		// tick partway into attack
		const partial = d.run(Math.round(0.02 * SR), { gate: 1, attack, release }).out!;
		expect(partial).toBeGreaterThan(0.05);
		expect(partial).toBeLessThan(1);
		// drop gate — must release from `partial`, reach 0 in bounded time, not stall
		const rel = d.trace(Math.round((release + 0.05) * SR), "out", { gate: 0, attack, release });
		expect(Math.max(...rel)).toBeLessThanOrEqual(partial + 1e-6);
		expect(rel[rel.length - 1]!).toBeCloseTo(0, 3);
	});
});

describe("adsr", () => {
	it("full gate cycle reaches sustain, holds, then releases to 0", () => {
		const d = driver(adsr);
		const p = { gate: 1, attack: 0.01, decay: 0.02, sustain: 0.5, release: 0.05 };
		d.run(Math.round(0.1 * SR), p); // attack+decay settle
		const sustained = d.run(100, p).out;
		expect(sustained).toBeCloseTo(0.5, 2);
		const rel = d.trace(Math.round(0.1 * SR), "out", { ...p, gate: 0 });
		expect(rel[rel.length - 1]!).toBeCloseTo(0, 3);
	});

	it("sustain=0 reaches 0 and never hangs (the core2 bug)", () => {
		const d = driver(adsr);
		const p = { gate: 1, attack: 0.005, decay: 0.02, sustain: 0, release: 0.05 };
		// hold gate high for a long time; with sustain 0 the level must settle to 0
		const xs = d.trace(Math.round(0.2 * SR), "out", p);
		expect(Math.max(...xs)).toBeCloseTo(1, 1); // attack peak still reached
		expect(xs[xs.length - 1]!).toBeCloseTo(0, 4); // decays to 0 and holds
		// and it does not oscillate/hang: last quarter is flat at 0
		const tail = xs.slice(Math.floor(xs.length * 0.75));
		expect(Math.max(...tail)).toBeLessThan(1e-3);
	});

	it("release from sustain=0 is immediate (already 0)", () => {
		const d = driver(adsr);
		const p = { gate: 1, attack: 0.005, decay: 0.02, sustain: 0, release: 0.05 };
		d.run(Math.round(0.2 * SR), p);
		const rel = d.run(200, { ...p, gate: 0 }).out;
		expect(rel).toBeCloseTo(0, 4);
	});

	it("gate dropped during attack releases from current level (adsr)", () => {
		const d = driver(adsr);
		const p = { gate: 1, attack: 0.1, decay: 0.02, sustain: 0.5, release: 0.05 };
		const partial = d.run(Math.round(0.02 * SR), p).out!;
		expect(partial).toBeGreaterThan(0.05);
		expect(partial).toBeLessThan(1);
		const rel = d.trace(Math.round(0.1 * SR), "out", { ...p, gate: 0 });
		expect(Math.max(...rel)).toBeLessThanOrEqual(partial + 1e-6);
		expect(rel[rel.length - 1]!).toBeCloseTo(0, 3);
	});
});
