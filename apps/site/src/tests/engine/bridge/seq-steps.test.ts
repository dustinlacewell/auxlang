/**
 * The step-sequencer idiom (MANIFESTO §4.2): `counter(trig).seq(p.steps())`
 * moves one step per trig, rests and ties included. `a _` and `a@2` sound the
 * same by time and differ by steps.
 */

import { clock, factory, p, runProgram, seq } from "@/engine/api";
import { renderTap } from "@/engine/runtime/render";
import { describe, expect, it } from "vitest";
import { SR, countOnes, nodeIndex } from "./helpers";

const counter = factory("counter");

/** 480 bpm: one beat every 6000 samples; the first beat holds step 0. */
const BEAT = SR / 8;

function stepTaps(pattern: ReturnType<typeof p>, samples: number) {
	const program = runProgram(() => {
		const steps = counter(clock(480).beat);
		seq(pattern.steps(), steps).tri().out();
	});
	const si = nodeIndex(program, "seq");
	return {
		gate: renderTap(program, si, "gate", 0, samples),
		trig: renderTap(program, si, "trig", 0, samples),
		out: renderTap(program, si, "out", 0, samples),
	};
}

/** The tap's value in the middle of each of the first `n` beats. */
const midBeats = (buf: Float32Array, n: number) =>
	Array.from({ length: n }, (_, k) => buf[Math.floor((k + 0.5) * BEAT)]);

describe("counter(trig).seq(p.steps())", () => {
	it("reads c ~ e ~ as four steps, two rests", () => {
		const { gate, out } = stepTaps(p`c4 ~ e4 ~`, 4 * BEAT);
		expect(midBeats(gate, 4)).toEqual([1, 0, 1, 0]);
		expect(midBeats(out, 4)).toEqual([60, 60, 64, 64]);
	});

	it("reads a _ as two steps of one note and a@2 as one", () => {
		const tied = stepTaps(p`c4 _ e4`, 3 * BEAT - 10);
		expect(midBeats(tied.out, 3)).toEqual([60, 60, 64]);
		expect(countOnes(tied.trig)).toBe(2);
		const held = stepTaps(p`c4@2 e4`, 3 * BEAT - 10);
		expect(midBeats(held.out, 3)).toEqual([60, 64, 60]);
		expect(countOnes(held.trig)).toBe(3);
	});
});
