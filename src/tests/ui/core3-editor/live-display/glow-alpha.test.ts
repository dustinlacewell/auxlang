import {
	MAX_ALPHA,
	MAX_ALPHA_AUDIO,
	glowAlpha,
	glowMarkClass,
} from "@/ui/core3-editor/live-display/glow-alpha";
import { describe, expect, it } from "vitest";

describe("glowAlpha", () => {
	it("zero intensity (step 0) is zero alpha regardless of kind", () => {
		expect(glowAlpha(0, 16, "bipolar")).toBe(0);
		expect(glowAlpha(0, 16, "audio")).toBe(0);
	});

	it("caps a non-audio glow at MAX_ALPHA", () => {
		expect(glowAlpha(16, 16, "bipolar")).toBeCloseTo(MAX_ALPHA);
		expect(glowAlpha(16, 16, "unipolar")).toBeCloseTo(MAX_ALPHA);
		expect(glowAlpha(16, 16, "trig")).toBeCloseTo(MAX_ALPHA);
	});

	it("caps an audio glow lower, at MAX_ALPHA_AUDIO", () => {
		expect(glowAlpha(16, 16, "audio")).toBeCloseTo(MAX_ALPHA_AUDIO);
		expect(MAX_ALPHA_AUDIO).toBeLessThan(MAX_ALPHA);
	});

	it("scales linearly between 0 and the cap", () => {
		expect(glowAlpha(8, 16, "bipolar")).toBeCloseTo(MAX_ALPHA / 2);
	});
});

describe("glowMarkClass", () => {
	it("step 0 gets no decoration class at all", () => {
		expect(glowMarkClass(0, "bipolar", 0)).toBe("");
	});

	it("a non-audio step gets the plain step class", () => {
		expect(glowMarkClass(5, "unipolar", 0)).toBe("aux-glow aux-glow-5");
	});

	it("an audio step gets the audio-capped class", () => {
		expect(glowMarkClass(5, "audio", 0)).toBe("aux-glow aux-glow-audio-5");
	});

	it("a bipolar sign adds the pos/neg class", () => {
		expect(glowMarkClass(5, "bipolar", 1)).toBe("aux-glow aux-glow-5 aux-glow-pos");
		expect(glowMarkClass(5, "bipolar", -1)).toBe("aux-glow aux-glow-5 aux-glow-neg");
	});
});
