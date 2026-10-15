/**
 * seq's read-step helpers (modules/lib/timing/seq.js): gate, trig, and slide
 * on plain numbers. trig fires on entering a different note (ties belong to
 * their note; rests forget the note; a slide entered from the note it slides
 * from is quiet); the unclocked dip runs from a trig into a high gate; the
 * clocked dip is the window before a marked row ends. The helpers are built
 * from the registered source text, the text both backends run.
 */

import "@/core3/modules/all";
import { getModule } from "@/core3/module/define";
import {
	KIND_NOTE,
	KIND_REST,
	KIND_SLIDE,
	KIND_TIE,
	NO_NOTE,
} from "@/core3/pattern/table/event-table";
import { describe, expect, it } from "vitest";

type Helper = (...args: number[]) => number;

function helper(name: string): Helper {
	const text = getModule("seq").source?.helpers[name];
	if (text === undefined) throw new Error(`seq has no helper '${name}'`);
	return new Function(`"use strict"; return (${text});`)() as Helper;
}

const trigOf = helper("trigOf");
const slideOf = helper("slideOf");
const heldNoteId = helper("heldNoteId");
const dipLeftAfter = helper("dipLeftAfter");
const inDipWindow = helper("inDipWindow");
const gateOf = helper("gateOf");
const dipSamplesAt = helper("dipSamplesAt");
const dipBeatsAt = helper("dipBeatsAt");

describe("heldNoteId", () => {
	it("is NO_NOTE inside a rest, the row's note otherwise", () => {
		expect(Object.is(heldNoteId(KIND_REST, 0.5), NO_NOTE)).toBe(true);
		expect(heldNoteId(KIND_TIE, 0.5)).toBe(0.5);
	});

	it("starts as NO_NOTE in a fresh lane", () => {
		expect(Object.is(getModule("seq").state?.(48000).noteId, NO_NOTE)).toBe(true);
	});
});

describe("trigOf", () => {
	const none = NO_NOTE;

	it("fires on a note different from the one before, in any direction", () => {
		expect(trigOf(KIND_NOTE, 0.5, none, 0.25)).toBe(1);
		expect(trigOf(KIND_NOTE, 0.25, none, 0.5)).toBe(1);
		expect(trigOf(KIND_NOTE, 7, none, NO_NOTE)).toBe(1);
	});

	it("stays quiet inside the same note, its tie, and rests", () => {
		expect(trigOf(KIND_NOTE, 0.5, none, 0.5)).toBe(0);
		expect(trigOf(KIND_TIE, 0.5, none, 0.5)).toBe(0);
		expect(trigOf(KIND_REST, NO_NOTE, none, 0.5)).toBe(0);
	});

	it("fires when a tie is entered from outside its note", () => {
		expect(trigOf(KIND_TIE, 0.5, none, 2)).toBe(1);
	});

	it("re-fires a note entered again after a rest", () => {
		const inRest = heldNoteId(KIND_REST, NO_NOTE);
		expect(trigOf(KIND_NOTE, 0.5, none, inRest)).toBe(1);
	});

	it("stays quiet entering a slide from the note it slides from", () => {
		expect(trigOf(KIND_SLIDE, 0.5, 0.25, 0.25)).toBe(0);
	});

	it("fires entering a slide any other way", () => {
		expect(trigOf(KIND_SLIDE, 0.5, 0.25, 0.75)).toBe(1);
		expect(trigOf(KIND_SLIDE, 0.5, 0.25, NO_NOTE)).toBe(1);
	});
});

describe("slideOf", () => {
	it("is high only inside a slide", () => {
		expect(slideOf(KIND_SLIDE)).toBe(1);
		expect(slideOf(KIND_NOTE)).toBe(0);
		expect(slideOf(KIND_TIE)).toBe(0);
		expect(slideOf(KIND_REST)).toBe(0);
	});
});

describe("unclocked dip", () => {
	const DIP = dipSamplesAt(48000);

	it("lasts round(1 ms · sr) samples", () => {
		expect(DIP).toBe(48);
		expect(dipSamplesAt(44100)).toBe(44);
	});

	it("starts on a trig into a high gate and holds the gate low until it runs out", () => {
		let dip = dipLeftAfter(1, 1, 0, DIP);
		let low = 0;
		while (gateOf(KIND_NOTE, dip, 0) === 0) {
			low++;
			dip = dipLeftAfter(0, 0, dip, DIP);
		}
		expect(low).toBe(DIP);
	});

	it("does not start on a trig from a low gate", () => {
		expect(dipLeftAfter(1, 0, 0, DIP)).toBe(0);
	});
});

describe("clocked dip", () => {
	it("is the last dipBeats of a marked row", () => {
		expect(inDipWindow(0.999, 1, 1, 0.01)).toBe(1);
		expect(inDipWindow(0.98, 1, 1, 0.01)).toBe(0);
		expect(inDipWindow(0.999, 1, 0, 0.01)).toBe(0);
	});

	it("measures 1 ms in position units from the per-sample step", () => {
		expect(dipBeatsAt(1, 2 / 48000, 48000)).toBeCloseTo(0.002, 12);
		expect(dipBeatsAt(1, 0, 48000)).toBe(0);
		expect(dipBeatsAt(1, -1, 48000)).toBe(0);
	});

	it("is empty before the reader has a first step", () => {
		expect(dipBeatsAt(0, 2 / 48000, 48000)).toBe(0);
	});
});

describe("gateOf", () => {
	it("is high in notes and ties, low in rests, dips and dip windows", () => {
		expect(gateOf(KIND_NOTE, 0, 0)).toBe(1);
		expect(gateOf(KIND_TIE, 0, 0)).toBe(1);
		expect(gateOf(KIND_REST, 0, 0)).toBe(0);
		expect(gateOf(KIND_NOTE, 3, 0)).toBe(0);
		expect(gateOf(KIND_NOTE, 0, 1)).toBe(0);
	});
});
