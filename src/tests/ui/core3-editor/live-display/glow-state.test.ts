import {
	createGlowState,
	glowOf,
	type Levels,
} from "@/ui/core3-editor/live-display/glow-state";
import { describe, expect, it } from "vitest";

const levels = (over: Partial<Levels>): Levels => ({
	last: 0,
	min: -1,
	max: 1,
	peak: 0,
	hits: 0,
	...over,
});

describe("glowOf", () => {
	it("unipolar: brightness from the last value within [min, max]", () => {
		const g = glowOf(levels({ last: 0.5, min: 0, max: 1 }), "unipolar", createGlowState(), 0);
		expect(g.intensity).toBeCloseTo(0.5);
		expect(g.sign).toBe(0);
	});

	it("bipolar: sign from last value, intensity from its magnitude", () => {
		const pos = glowOf(levels({ last: 0.6 }), "bipolar", createGlowState(), 0);
		expect(pos.sign).toBe(1);
		expect(pos.intensity).toBeCloseTo(0.6);

		const neg = glowOf(levels({ last: -0.3 }), "bipolar", createGlowState(), 0);
		expect(neg.sign).toBe(-1);
		expect(neg.intensity).toBeCloseTo(0.3);
	});

	it("audio: intensity from peak |x|", () => {
		const g = glowOf(levels({ peak: 0.8 }), "audio", createGlowState(), 0);
		expect(g.intensity).toBeCloseTo(0.8);
	});

	it("trig: a single hit flashes and decays over time", () => {
		const state = createGlowState();
		const onHit = glowOf(levels({ hits: 1 }), "trig", state, 0);
		expect(onHit.flash).toBeGreaterThan(0.9);

		const later = glowOf(levels({ hits: 0 }), "trig", state, 90);
		expect(later.flash).toBeGreaterThan(0);
		expect(later.flash).toBeLessThan(onHit.flash);

		const muchLater = glowOf(levels({ hits: 0 }), "trig", state, 1000);
		expect(muchLater.flash).toBe(0);
	});

	it("trig: hits faster than ~3 Hz show a steady average, not a flash per hit", () => {
		const state = createGlowState();
		// 10 Hz: a hit every 100ms.
		glowOf(levels({ hits: 1 }), "trig", state, 0);
		glowOf(levels({ hits: 1 }), "trig", state, 100);
		const steady = glowOf(levels({ hits: 1 }), "trig", state, 200);
		expect(steady.intensity).toBeGreaterThan(0);
		// A steady read holds between hits too — no on/off flicker.
		const between = glowOf(levels({ hits: 0 }), "trig", state, 250);
		expect(between.intensity).toBeGreaterThan(0);
	});

	it("trig: hits at ~1 Hz still flash per hit", () => {
		const state = createGlowState();
		glowOf(levels({ hits: 1 }), "trig", state, 0);
		const onHit = glowOf(levels({ hits: 1 }), "trig", state, 1000);
		expect(onHit.flash).toBeGreaterThan(0.9);
		const decaying = glowOf(levels({ hits: 0 }), "trig", state, 1090);
		expect(decaying.flash).toBeGreaterThan(0);
		expect(decaying.flash).toBeLessThan(1);
	});

	it("reduced motion: a trig hit reads with no flash sweep", () => {
		const state = createGlowState();
		const onHit = glowOf(levels({ hits: 1 }), "trig", state, 0, true);
		expect(onHit.flash).toBe(0);
	});
});
