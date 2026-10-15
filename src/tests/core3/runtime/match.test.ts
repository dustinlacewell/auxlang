/**
 * The re-eval matcher (MANIFESTO §6.2): pins first, then place (ties broken
 * by upstream signature), then kind, each pass pairing in program order among
 * what the earlier passes left.
 */

import { describe, expect, it } from "vitest";

import { match } from "@/core3/runtime/match";
import type { Identity, KeyedIdentity } from "@/core3/types";

const node = (kind: string, place: string, pin?: string, upstream = "u"): Identity =>
	pin === undefined ? { kind, place, upstream } : { kind, place, upstream, pin };
const old = (
	key: string,
	kind: string,
	place: string,
	pin?: string,
	upstream?: string,
): KeyedIdentity => ({ ...node(kind, place, pin, upstream), key });

describe("match: ties at one place", () => {
	it("break by upstream signature before code order", () => {
		const paired = match(
			[old("A", "lpf", "p1", undefined, "saw"), old("B", "lpf", "p1", undefined, "sin")],
			[node("lpf", "p1", undefined, "sin"), node("lpf", "p1", undefined, "saw")],
		);
		expect([paired.get(0), paired.get(1)]).toEqual(["B", "A"]);
	});

	it("fall back to code order when the signatures are identical", () => {
		const paired = match(
			[old("A", "lpf", "p1", undefined, "saw"), old("B", "lpf", "p1", undefined, "saw")],
			[node("lpf", "p1", undefined, "saw"), node("lpf", "p1", undefined, "saw")],
		);
		expect([paired.get(0), paired.get(1)]).toEqual(["A", "B"]);
	});

	it("never steal a unique place match", () => {
		const paired = match(
			[old("A", "lpf", "p1", undefined, "saw"), old("B", "lpf", "p2", undefined, "sin")],
			[node("lpf", "p1", undefined, "sin"), node("lpf", "p2", undefined, "saw")],
		);
		expect([paired.get(0), paired.get(1)]).toEqual(["A", "B"]);
	});

	it("never override a pin", () => {
		const paired = match(
			[old("bass", "lpf", "p1", "bass", "saw"), old("B", "lpf", "p1", undefined, "sin")],
			[node("lpf", "p1", undefined, "saw"), node("lpf", "p1", "bass", "sin")],
		);
		expect([paired.get(0), paired.get(1)]).toEqual(["B", "bass"]);
	});
});

describe("match", () => {
	it("pairs by place, whatever the order", () => {
		const paired = match(
			[old("A", "lpf", "p1"), old("B", "lpf", "p2")],
			[node("lpf", "p2"), node("lpf", "p1")],
		);
		expect([...paired]).toEqual([
			[0, "B"],
			[1, "A"],
		]);
	});

	it("pairs a moved node with the leftover of its kind", () => {
		const paired = match([old("A", "saw", "p1")], [node("saw", "p9")]);
		expect(paired.get(0)).toBe("A");
	});

	it("leaves a node of a new kind unpaired", () => {
		const paired = match([old("A", "saw", "p1")], [node("sin", "p1x")]);
		expect(paired.size).toBe(0);
	});

	it("pairs duplicates at one place in order", () => {
		const paired = match(
			[old("A", "sin", "p1"), old("B", "sin", "p1")],
			[node("sin", "p1"), node("sin", "p1")],
		);
		expect([paired.get(0), paired.get(1)]).toEqual(["A", "B"]);
	});

	it("a pin wins over place", () => {
		const paired = match(
			[old("A", "sin", "p1"), old("bass", "sin", "p2", "bass")],
			[node("sin", "p1", "bass"), node("sin", "p2")],
		);
		expect([paired.get(0), paired.get(1)]).toEqual(["bass", "A"]);
	});

	it("place wins over kind order", () => {
		const paired = match(
			[old("A", "sin", "p1"), old("B", "sin", "p2")],
			[node("sin", "p9"), node("sin", "p2")],
		);
		expect([paired.get(0), paired.get(1)]).toEqual(["A", "B"]);
	});

	it("pairs each old node at most once", () => {
		const paired = match([old("A", "sin", "p1")], [node("sin", "p1"), node("sin", "p1")]);
		expect([paired.get(0), paired.get(1)]).toEqual(["A", undefined]);
	});
});
