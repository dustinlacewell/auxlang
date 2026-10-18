import { describe, expect, it } from "vitest";

import "@/engine/modules/all";
import { getModule } from "@/engine/module/define";
import { evalPatch } from "@/engine/eval-patch";
import { reduceDriver } from "./helpers";

const spread = getModule("spread");

/** spread's l/r for one sample of `lanes`, at `amount`. */
function place(lanes: number[], amount?: number) {
	const d = reduceDriver(spread, lanes.length);
	const ins = { in: Float64Array.from(lanes), ...(amount === undefined ? {} : { amount }) };
	const o = d.step(ins);
	return { l: o.l!, r: o.r!, power: o.l! ** 2 + o.r! ** 2 };
}

const third = 1 / 3;

describe("spread", () => {
	it("width 3 at amount 1: lanes go left, center, right with equal power", () => {
		const left = place([1, 0, 0], 1);
		const center = place([0, 1, 0], 1);
		const right = place([0, 0, 1], 1);
		expect(left.l).toBeCloseTo(Math.sqrt(third), 6);
		expect(left.r).toBeCloseTo(0, 6);
		expect(center.l).toBeCloseTo(center.r, 6);
		expect(right.l).toBeCloseTo(0, 6);
		expect(right.r).toBeCloseTo(Math.sqrt(third), 6);
		for (const lane of [left, center, right]) expect(lane.power).toBeCloseTo(third, 6);
	});

	it("a single lane sits in the center", () => {
		const { l, r } = place([1]);
		expect(l).toBeCloseTo(Math.SQRT1_2, 6);
		expect(r).toBeCloseTo(Math.SQRT1_2, 6);
	});

	it("amount defaults to 1 and scales the positions toward the center", () => {
		expect(place([1, 0, 0])).toEqual(place([1, 0, 0], 1));
		const narrow = place([1, 0, 0], 0.5); // pos -0.5
		const theta = (0.25 / 1) * (Math.PI / 2);
		expect(narrow.l).toBeCloseTo(Math.cos(theta) * Math.sqrt(third), 6);
		expect(narrow.r).toBeCloseTo(Math.sin(theta) * Math.sqrt(third), 6);
		const none = place([1, 0, 0], 0);
		expect(none.l).toBeCloseTo(none.r, 6);
	});

	it("connects by name into out, and is a loud error into a mono input", () => {
		expect(() => evalPatch(`tempo(90)\nseq("[c3, e3, g3]").saw().spread().out()`)).not.toThrow();
		expect(() => evalPatch(`tempo(90)\nseq("[c3, e3, g3]").saw().spread().lpf(79).out()`)).toThrow(
			/stereo/,
		);
	});
});
