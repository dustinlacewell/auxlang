import { describe, expect, it } from "vitest";

import { fastcat, polymeter, pure, stack } from "@/pattern/combinators";
import { laneOf } from "@/pattern/event";
import { r } from "@/pattern/rational";
import { evSet, onsetKeys, onsets, queryCycles } from "./helpers";

const abc = fastcat([pure(1), pure(2), pure(3)]);
const de = fastcat([pure(4), pure(5)]);

describe("polymeter", () => {
	it("takes its steps per cycle from the first layer", () => {
		const pat = polymeter([abc, de]);
		expect(pat.op === "polymeter" && pat.layers.map((l) => l.steps)).toEqual([r(3), r(2)]);
	});

	it("plays every layer at the first layer's step rate: d e d, e d e", () => {
		const evs = queryCycles(polymeter([abc, de]), 0, 2);
		const second = evs.filter((ev) => ev.value >= 4);
		expect(second.map((ev) => ev.value)).toEqual([4, 5, 4, 5, 4, 5]);
		expect(onsetKeys(second)).toEqual(["0/1", "1/3", "2/3", "1/1", "4/3", "5/3"]);
	});

	it("puts each layer in its own lanes, like stack", () => {
		const evs = queryCycles(polymeter([abc, de]), 0, 1);
		expect(new Set(evs.filter((ev) => ev.value < 4).map(laneOf))).toEqual(new Set([0]));
		expect(new Set(evs.filter((ev) => ev.value >= 4).map(laneOf))).toEqual(new Set([1]));
	});

	it("with equal step counts it is a stack", () => {
		const a = fastcat([pure(1), pure(2)]);
		expect(evSet(queryCycles(polymeter([a, de]), 0, 4))).toEqual(
			evSet(queryCycles(stack([a, de]), 0, 4)),
		);
	});

	it("a later layer with more steps is slowed down", () => {
		const evs = onsets(queryCycles(polymeter([de, abc]), 0, 3));
		expect(evs.filter((ev) => ev.value < 4).map((ev) => ev.value)).toEqual([1, 2, 3, 1, 2, 3]);
	});

	it("needs at least one layer", () => {
		expect(() => polymeter([])).toThrow(/at least one layer/);
	});
});
