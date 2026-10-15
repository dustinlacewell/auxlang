/**
 * Rests, ties, and slides are event kinds (MANIFESTO §3.1): `~` is a rest
 * event, `a _` is a note then a tie event, `a_b` is a note then a slide.
 */

import { describe, expect, it } from "vitest";

import { fastcat, pure, rest, slide, tie } from "@/core3/pattern/combinators";
import { isOnset } from "@/core3/pattern/event";
import { parse } from "@/core3/pattern/notation/parse";
import { queryCycles } from "./helpers";

const kinds = (src: string) => queryCycles(parse(src), 0, 1).map((ev) => ev.kind);

describe("event kinds", () => {
	it("a rest fills its step", () => {
		const evs = queryCycles(rest(), 0, 2);
		expect(evs.map((ev) => ev.kind)).toEqual(["rest", "rest"]);
		expect(isOnset(evs[0]!)).toBe(false);
	});

	it("a tie emits one tie per lane, no onset", () => {
		const evs = queryCycles(tie(3), 0, 1);
		expect(evs.map((ev) => [ev.kind, ev.lane ?? 0])).toEqual([
			["tie", 0],
			["tie", 1],
			["tie", 2],
		]);
		expect(isOnset(evs[0]!)).toBe(false);
	});

	it("slide marks notes as slides, which are onsets", () => {
		const evs = queryCycles(fastcat([pure(60), slide(pure(64))]), 0, 1);
		expect(evs.map((ev) => ev.kind)).toEqual(["note", "slide"]);
		expect(isOnset(evs[1]!)).toBe(true);
	});

	it("slide leaves rests and ties alone", () => {
		expect(queryCycles(slide(fastcat([rest(), tie(1)])), 0, 1).map((ev) => ev.kind)).toEqual([
			"rest",
			"tie",
		]);
	});
});

describe("notation", () => {
	it("~ is a rest step, so the slot stays", () => {
		expect(kinds("c ~ e ~")).toEqual(["note", "rest", "note", "rest"]);
	});

	it("a _ is a note then a tie step", () => {
		expect(kinds("c _ e")).toEqual(["note", "tie", "note"]);
	});

	it("a_b_c is a note then two slides in one step", () => {
		expect(kinds("c_e_g a")).toEqual(["note", "slide", "slide", "note"]);
	});

	it("kinds pass through time transforms", () => {
		const evs = queryCycles({ op: "fast", factor: { n: 2, d: 1 }, child: parse("c _") }, 0, 0.5);
		expect(evs.map((ev) => ev.kind)).toEqual(["note", "tie"]);
	});

	it("ply repeats a slide as a slide then notes", () => {
		const plied = queryCycles({ op: "ply", n: 2, child: slide(pure(64)) }, 0, 1);
		expect(plied.map((ev) => ev.kind)).toEqual(["slide", "note"]);
	});
});
