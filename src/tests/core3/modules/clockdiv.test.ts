import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { getModule } from "@/core3/module/define";
import { driver } from "./helpers";

const clockdiv = getModule("clockdiv");

/** n single-sample trigs, one every other sample. */
const pulses = (n: number) => Array.from({ length: 2 * n }, (_, k) => (k % 2 === 0 ? 1 : 0));

/** Step clockdiv one sample per entry of `trigs`; return which pulses passed (by pulse index). */
function passed(trigs: number[], ins: { by?: number; resets?: number[] } = {}): number[] {
	const d = driver(clockdiv);
	const out: number[] = [];
	let pulse = -1;
	trigs.forEach((trig, k) => {
		const o = d.step({ trig, by: ins.by ?? 4, reset: ins.resets?.[k] ?? 0 }).out!;
		if (trig > 0.5 && (k === 0 || (trigs[k - 1] ?? 0) <= 0.5)) pulse++;
		if (o > 0.5 && !out.includes(pulse)) out.push(pulse);
	});
	return out;
}

describe("clockdiv", () => {
	it("passes the first trig and every by-th after it", () => {
		expect(passed(pulses(9), { by: 4 })).toEqual([0, 4, 8]);
		expect(passed(pulses(5), { by: 2 })).toEqual([0, 2, 4]);
	});

	it("defaults to by 4", () => {
		const d = driver(clockdiv);
		const outs = pulses(9).map((trig) => d.step({ trig }).out!);
		expect(outs.filter((o) => o > 0.5)).toHaveLength(3);
	});

	it("by 1 passes every trig; below 1 counts as 1", () => {
		expect(passed(pulses(3), { by: 1 })).toEqual([0, 1, 2]);
		expect(passed(pulses(3), { by: 0 })).toEqual([0, 1, 2]);
	});

	it("passes a gate through at its own width", () => {
		const d = driver(clockdiv);
		const gate = [1, 1, 1, 0, 0, 1, 1, 0];
		const outs = gate.map((trig) => d.step({ trig, by: 2 }).out);
		expect(outs).toEqual([1, 1, 1, 0, 0, 0, 0, 0]);
	});

	it("reset makes the next trig pass, even on the same sample", () => {
		const trigs = pulses(6);
		const resets = trigs.map((_, k) => (k === 4 ? 1 : 0)); // with pulse 2
		expect(passed(trigs, { by: 4, resets })).toEqual([0, 2]);
	});

	it("a smaller by passes as soon as enough trigs have gone by", () => {
		const d = driver(clockdiv);
		const outs: number[] = [];
		for (let k = 0; k < 6; k++) {
			const by = k < 2 ? 8 : 2; // pulses 0 and 1 at by 8, then by 2
			outs.push(d.step({ trig: 1, by }).out!, d.step({ trig: 0, by }).out!);
		}
		const passedPulses = outs.flatMap((o, k) => (k % 2 === 0 && o > 0.5 ? [k / 2] : []));
		expect(passedPulses).toEqual([0, 2, 4]);
	});
});
