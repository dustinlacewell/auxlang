/**
 * .steps() re-times by steps (MANIFESTO §4.2): the nth event, rests and ties
 * included, spans [n, n+1). Stacks count per layer; a stack inside a
 * sequence is one step. fast/slow do nothing; rev, euclid, every, ?, and
 * <a b> keep their meaning. .compact() drops rests.
 */

import { describe, expect, it } from "vitest";

import type { Ev } from "@/core3/pattern/event";
import { laneOf } from "@/core3/pattern/event";
import { p } from "@/core3/pattern/notation/template";
import type { P } from "@/core3/pattern/pat-class";
import { rtof } from "@/core3/pattern/rational";
import { evSet, queryCycles } from "./helpers";

const read = (x: P, from: number, to: number, seed = 0) => queryCycles(x.ast, from, to, seed);
const values = (evs: readonly Ev[]) => evs.map((ev) => ev.value);
const kinds = (evs: readonly Ev[]) => evs.map((ev) => ev.kind);
const lane = (evs: readonly Ev[], l: number) => evs.filter((ev) => laneOf(ev) === l);

describe(".steps()", () => {
	it("gives c ~ e ~ four one-step events, two of them rests", () => {
		const evs = read(p`c4 ~ e4 ~`.steps(), 0, 4);
		expect(evs.map((ev) => rtof(ev.whole!.begin))).toEqual([0, 1, 2, 3]);
		expect(evs.map((ev) => rtof(ev.whole!.end))).toEqual([1, 2, 3, 4]);
		expect(kinds(evs)).toEqual(["note", "rest", "note", "rest"]);
	});

	it("counts a _ as two steps and a@2 as one", () => {
		expect(kinds(read(p`c4 _`.steps(), 0, 2))).toEqual(["note", "tie"]);
		expect(kinds(read(p`c4@2`.steps(), 0, 2))).toEqual(["note", "note"]);
		expect(read(p`c4@2 e4`.steps(), 0, 2).map((ev) => ev.value)).toEqual([60, 64]);
	});

	it("counts the events of a subdivided step", () => {
		expect(values(read(p`c4 [e4 g4]`.steps(), 0, 3))).toEqual([60, 64, 67]);
	});

	it("ignores fast and slow", () => {
		const plain = evSet(read(p`c4 e4 g4`.steps(), 0, 9));
		expect(evSet(read(p`c4 e4 g4`.fast(2).steps(), 0, 9))).toEqual(plain);
		expect(evSet(read(p`c4 e4 g4`.slow(3).steps(), 0, 9))).toEqual(plain);
	});

	it("keeps <a b>, rev, every, and euclid", () => {
		expect(values(read(p`<c4 e4> g4`.steps(), 0, 4))).toEqual([60, 67, 64, 67]);
		expect(values(read(p`c4 e4 g4`.rev().steps(), 0, 3))).toEqual([67, 64, 60]);
		expect(values(read(p`c4 e4`.every(2, (q) => q.add(12)).steps(), 0, 4))).toEqual([
			72, 76, 60, 64,
		]);
		const euclid = read(p`c4(3,8)`.steps(), 0, 8);
		expect(kinds(euclid).filter((k) => k === "note")).toHaveLength(3);
		expect(euclid).toHaveLength(8);
	});

	it("keeps every degraded slot as a rest", () => {
		const evs = read(p`c4 e4 g4 b4`.degrade(1).steps(), 0, 4);
		expect(kinds(evs)).toEqual(["rest", "rest", "rest", "rest"]);
	});

	it("drops the same notes under ? as the pattern read by time", () => {
		const timed = read(p`c4 e4 g4 b4`.degrade(0.5), 0, 4, 9).map((ev) => ev.kind);
		const stepped = read(p`c4 e4 g4 b4`.degrade(0.5).steps(), 0, 16, 9).map((ev) => ev.kind);
		expect(stepped).toEqual(timed);
	});

	it("counts each layer of a stack on its own, keeping lanes", () => {
		const evs = read(p`[c4 e4, g4 a4 b4]`.steps(), 0, 6);
		expect(values(lane(evs, 0))).toEqual([60, 64, 60, 64, 60, 64]);
		expect(values(lane(evs, 1))).toEqual([67, 69, 71, 67, 69, 71]);
	});

	it("makes a stack nested in a sequence one step (a chord)", () => {
		const evs = read(p`c4 [e4, g4] a4`.steps(), 0, 3);
		expect(evs.map((ev) => [rtof(ev.whole!.begin), ev.value, laneOf(ev)])).toEqual([
			[0, 60, 0],
			[1, 64, 0],
			[1, 67, 1],
			[2, 69, 0],
		]);
	});

	it("repeats its period backwards too", () => {
		expect(values(read(p`c4 e4 g4`.steps(), -1, 0))).toEqual([67]);
	});

	it("is a loud error without a finite period", () => {
		expect(() => p`c4? e4`.compact().steps()).toThrow(/no finite period/);
	});
});

describe(".compact()", () => {
	it("removes rests and keeps notes and ties", () => {
		const evs = read(p`c4 ~ e4 _`.compact(), 0, 1);
		expect(kinds(evs)).toEqual(["note", "note", "tie"]);
	});

	it("shortens the steps under steps()", () => {
		expect(values(read(p`c4 ~ e4 ~`.compact().steps(), 0, 4))).toEqual([60, 64, 60, 64]);
	});
});
