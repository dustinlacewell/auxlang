/** What the Strudel-aligned notation forms sound like (MANIFESTO §3.3). */

import { describe, expect, it } from "vitest";

import { parse } from "@/core3/pattern/notation/parse";
import { p } from "@/core3/pattern/notation/template";
import { r } from "@/core3/pattern/rational";
import { evSet, onsetKeys, onsets, queryCycles } from "../pattern/helpers";

describe("{a b c, d e}: polymeter, steps from the first layer", () => {
	const evs = queryCycles(p`{0 1 2, 10 11}`.ast, 0, 2);
	const first = evs.filter((ev) => ev.value < 10);
	const second = evs.filter((ev) => ev.value >= 10);

	it("gives three steps per cycle on both layers", () => {
		const third = ["0/1", "1/3", "2/3", "1/1", "4/3", "5/3"];
		expect(onsetKeys(first)).toEqual(third);
		expect(onsetKeys(second)).toEqual(third);
	});

	it("the second layer cycles through its own steps: 10 11 10, 11 10 11", () => {
		expect(second.map((ev) => ev.value)).toEqual([10, 11, 10, 11, 10, 11]);
	});
});

describe("a?0.7: drops with probability 0.7", () => {
	it("drops about 70% over many cycles (seeded, exact)", () => {
		const kept = onsets(queryCycles(p`c4?0.7`.ast, 0, 1000, 7)).length;
		expect(kept).toBe(278);
	});

	it("bare ? drops half", () => {
		const kept = onsets(queryCycles(p`c4?`.ast, 0, 1000, 7)).length;
		expect(kept).toBeGreaterThan(450);
		expect(kept).toBeLessThan(550);
	});
});

describe("<a@2 b>: a weight inside alternation counts cycles", () => {
	it("a plays for 2 cycles, then b for 1", () => {
		const evs = onsets(queryCycles(p`<0@2 1>`.ast, 0, 6));
		expect(evs.map((ev) => ev.value)).toEqual([0, 1, 0, 1]);
		expect(onsetKeys(evs)).toEqual(["0/1", "2/1", "3/1", "5/1"]);
		expect(evs.map((ev) => ev.whole?.end)).toEqual([r(2), r(3), r(5), r(6)]);
	});

	it("unweighted steps still change every cycle", () => {
		const evs = onsets(queryCycles(p`<0 [1 2]@2 3>`.ast, 0, 4));
		expect(evs.map((ev) => ev.value)).toEqual([0, 1, 2, 3]);
		expect(onsetKeys(evs)).toEqual(["0/1", "1/1", "2/1", "3/1"]);
	});
});

describe("postfix modifiers compose in any order", () => {
	const same = (a: string, b: string) =>
		expect(evSet(queryCycles(parse(a), 0, 4, 3))).toEqual(evSet(queryCycles(parse(b), 0, 4, 3)));

	it("a!2@3 b and a@3!2 b give the same events", () => {
		same("c4!2@3 e4", "c4@3!2 e4");
		expect(onsetKeys(queryCycles(parse("c4!2@3 e4"), 0, 1))).toEqual(["0/1", "3/7", "6/7"]);
	});

	it("weight, count and pattern modifiers mix in any order", () => {
		same("c4*2@3 e4", "c4@3*2 e4");
		same("c4!2*2 e4", "c4*2!2 e4");
		same("c4(3,8)@2 e4", "c4@2(3,8) e4");
		same("c4?0.3!2 e4", "c4!2?0.3 e4");
	});
});

describe("a/2: slower within its step", () => {
	it("plays a every other cycle within its step", () => {
		const e4 = onsets(queryCycles(p`c4 e4/2`.ast, 0, 6)).filter((ev) => ev.value === 64);
		expect(onsetKeys(e4)).toEqual(["1/2", "5/2", "9/2"]);
	});

	it("[a b]/2 plays a in even cycles and b in odd cycles", () => {
		const evs = onsets(queryCycles(p`c4 [e4 g4]/2`.ast, 0, 4)).filter((ev) => ev.value !== 60);
		expect(evs.map((ev) => ev.value)).toEqual([64, 67, 64, 67]);
		expect(onsetKeys(evs)).toEqual(["1/2", "3/2", "5/2", "7/2"]);
	});
});
