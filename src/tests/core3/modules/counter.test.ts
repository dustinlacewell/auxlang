import { describe, expect, it } from "vitest";

import "@/core3/modules/counter";
import { getModule } from "@/core3/module/define";
import { driver } from "./helpers";

const counter = getModule("counter");

/** Step the counter one sample per entry of `trigs` (and `resets`); returns its outputs. */
function play(trigs: number[], resets: number[] = [], config: Record<string, unknown> = {}) {
	const d = driver(counter, config);
	return trigs.map((trig, k) => d.step({ trig, reset: resets[k] ?? 0 }).out as number);
}

/** n rising edges, one every other sample. */
const pulses = (n: number) => Array.from({ length: 2 * n }, (_, k) => (k % 2 === 0 ? 1 : 0));
const onEdges = (outs: number[]) => outs.filter((_, k) => k % 2 === 0);

describe("counter", () => {
	it("is step 0 before any trig, and the first trig holds step 0", () => {
		expect(play([0, 1, 0])).toEqual([0, 0, 0]);
	});

	it("each later rising edge moves one step", () => {
		expect(onEdges(play(pulses(4)))).toEqual([0, 1, 2, 3]);
	});

	it("a held trig counts once", () => {
		expect(play([1, 1, 1, 0, 1])).toEqual([0, 0, 0, 0, 1]);
	});

	it("length wraps the count", () => {
		expect(onEdges(play(pulses(5), [], { length: 3 }))).toEqual([0, 1, 2, 0, 1]);
	});

	it("reset returns to the start: step 0, held by the next trig", () => {
		const outs = play([1, 0, 1, 0, 0, 1, 0, 1], [0, 0, 0, 0, 1, 0, 0, 0]);
		expect(outs).toEqual([0, 0, 1, 1, 0, 0, 0, 1]);
	});
});
