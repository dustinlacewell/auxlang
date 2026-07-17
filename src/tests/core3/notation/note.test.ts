import { describe, expect, it } from "vitest";

import { atomValue } from "@/core3/pattern/notation/note";

describe("note -> MIDI semitone mapping", () => {
	it("c4 = 60", () => expect(atomValue("c4", 0)).toBe(60));
	it("c#4 = 61", () => expect(atomValue("c#4", 0)).toBe(61));
	it("bb3 = 58", () => expect(atomValue("bb3", 0)).toBe(58));
	it("a4 = 69", () => expect(atomValue("a4", 0)).toBe(69));

	it("default octave is 4", () => {
		expect(atomValue("c", 0)).toBe(60);
		expect(atomValue("a", 0)).toBe(69);
	});

	it("multi-digit octaves", () => {
		expect(atomValue("c10", 0)).toBe(132);
		expect(atomValue("c0", 0)).toBe(12);
	});

	it("double accidentals", () => {
		expect(atomValue("c##4", 0)).toBe(62);
		expect(atomValue("dbb4", 0)).toBe(60);
	});

	it("uppercase letters", () => {
		expect(atomValue("C4", 0)).toBe(60);
	});

	it("plain numbers are their own value", () => {
		expect(atomValue("12", 0)).toBe(12);
		expect(atomValue("0.5", 0)).toBe(0.5);
		expect(atomValue("-3", 0)).toBe(-3);
	});

	it("rejects garbage", () => {
		expect(() => atomValue("xyz", 5)).toThrow(/position 5/);
		expect(() => atomValue("h4", 3)).toThrow(/invalid/);
	});
});
