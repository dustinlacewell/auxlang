/**
 * A note-name string ("c4") at any module input converts like `semis(60)`:
 * same fold at a Hz port, same loud error at a port with no conversion.
 */

import "@/core3/modules/all";

import { factory, runProgram } from "@/core3/api";
import { semis } from "@/core3/units/tag";
import { noteNameToSemis } from "@/core3/units/note-name";
import { chord } from "@/core3/pattern/chord/chord";
import { describe, expect, it } from "vitest";

const sin = factory("sin");
const saw = factory("saw");
const lfo = factory("lfo");

describe("noteNameToSemis", () => {
	it("parses letter+octave: c4 = 60, a4 = 69", () => {
		expect(noteNameToSemis("c4")).toBe(60);
		expect(noteNameToSemis("a4")).toBe(69);
	});

	it("parses accidentals: f#3 = 54, eb2 = 39", () => {
		expect(noteNameToSemis("f#3")).toBe(54);
		expect(noteNameToSemis("eb2")).toBe(39);
	});

	it("defaults the octave to 4: c = 60", () => {
		expect(noteNameToSemis("c")).toBe(60);
	});

	it("returns undefined for non-note-name text", () => {
		expect(noteNameToSemis("h4")).toBeUndefined();
		expect(noteNameToSemis("c4 e4")).toBeUndefined();
		expect(noteNameToSemis("")).toBeUndefined();
	});
});

describe("note-name strings at module inputs", () => {
	it("sin(\"c4\") builds the same program as sin(60)", () => {
		const named = runProgram(() => sin("c4").gain(0).out());
		const plain = runProgram(() => sin(60).gain(0).out());
		const pitch = (p: ReturnType<typeof runProgram>) =>
			p.nodes.find((n) => n.module === "sin")!.lanes[0]!.pitch;
		expect(pitch(named)).toEqual(pitch(plain));
	});

	it("saw(48).lpf(\"c5\") sets cutoff to 72", () => {
		const program = runProgram(() => saw(48).lpf("c5").gain(0).out());
		const cutoff = program.nodes.find((n) => n.module === "lpf")!.lanes[0]!.cutoff;
		expect(cutoff).toEqual({ k: "c", v: 72 });
	});

	it("a note name at a Hz port converts like semis(n): lfo({ freq: \"a4\" }) equals lfo({ freq: semis(69) })", () => {
		const named = runProgram(() => lfo({ freq: "a4" }).gain(0).out());
		const tagged = runProgram(() => lfo({ freq: semis(69) }).gain(0).out());
		const freq = (p: ReturnType<typeof runProgram>) =>
			p.nodes.find((n) => n.module === "lfo")!.lanes[0]!.freq;
		expect(freq(named)).toEqual(freq(tagged));
	});

	it("a chord anchor of \"c\" now equals \"c4\" (octave defaults to 4 everywhere)", () => {
		expect(chord("<Cmaj7>").anchor("c")).toEqual(chord("<Cmaj7>").anchor("c4"));
	});

	it("sin(\"c4 e4\") throws: not a note name, points to p``", () => {
		expect(() => runProgram(() => sin("c4 e4").gain(0).out())).toThrow(
			/is not a note name.*p`/s,
		);
	});

	it("sin(\"h4\") throws: not a note name, points to p``", () => {
		expect(() => runProgram(() => sin("h4").gain(0).out())).toThrow(/is not a note name.*p`/s);
	});
});
