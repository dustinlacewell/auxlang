import { describe, expect, it } from "vitest";
import { noteToFreq } from "./note-to-freq";

describe("noteToFreq", () => {
	it("converts A4 to 440Hz", () => {
		expect(noteToFreq("a", null, 4)).toBe(440);
	});

	it("converts C4 (middle C) to ~261.63Hz", () => {
		expect(noteToFreq("c", null, 4)).toBeCloseTo(261.63, 1);
	});

	it("converts C#4 to ~277.18Hz", () => {
		expect(noteToFreq("c", "#", 4)).toBeCloseTo(277.18, 1);
	});

	it("converts Db4 to same frequency as C#4", () => {
		const cSharp = noteToFreq("c", "#", 4);
		const dFlat = noteToFreq("d", "b", 4);
		expect(dFlat).toBeCloseTo(cSharp, 5);
	});

	it("handles different octaves", () => {
		const c3 = noteToFreq("c", null, 3);
		const c4 = noteToFreq("c", null, 4);
		const c5 = noteToFreq("c", null, 5);

		// Each octave doubles the frequency
		expect(c4).toBeCloseTo(c3 * 2, 1);
		expect(c5).toBeCloseTo(c4 * 2, 1);
	});

	it("is case insensitive", () => {
		expect(noteToFreq("A", null, 4)).toBe(noteToFreq("a", null, 4));
		expect(noteToFreq("C", null, 4)).toBe(noteToFreq("c", null, 4));
	});

	it("throws for invalid note names", () => {
		expect(() => noteToFreq("x", null, 4)).toThrow("Invalid note name");
		expect(() => noteToFreq("h", null, 4)).toThrow("Invalid note name");
	});

	it("handles low octaves", () => {
		const c0 = noteToFreq("c", null, 0);
		expect(c0).toBeCloseTo(16.35, 1);
	});

	it("handles high octaves", () => {
		const c8 = noteToFreq("c", null, 8);
		expect(c8).toBeCloseTo(4186.01, 0);
	});
});
