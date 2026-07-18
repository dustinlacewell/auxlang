import { describe, expect, it } from "vitest";

import { quantize } from "@/core3/modules/quantize";
import { driver } from "./helpers";

/** Quantize a single pitch value with the given config/inputs. */
function q(pitch: number, cfg: Record<string, unknown> = {}, over: Record<string, number> = {}) {
	const d = driver(quantize, cfg);
	// wide window so folding does not move the result: octave 0, range 10 octaves
	return d.step({ pitch, root: 0, octave: 0, range: 10, ...over }).out;
}

describe("quantize", () => {
	it("major scale: snaps a non-scale semitone to the nearest degree", () => {
		// C major rooted at 0. Pitch 1 (C#) → nearest is 0 (C) or 2 (D); tie → picks first found (0 or 2).
		const r = q(1, { scaleName: "major" });
		expect([0, 2]).toContain(r);
		// pitch 6 (F#) in C major → nearest degree 5 (F) or 7 (G)
		expect([5, 7]).toContain(q(6, { scaleName: "major" }));
	});

	it("already-in-scale pitches pass through unchanged", () => {
		for (const deg of [0, 2, 4, 5, 7, 9, 11]) {
			expect(q(deg, { scaleName: "major" })).toBe(deg);
		}
	});

	it("minor scale differs from major on the third", () => {
		// pitch 3 (Eb) is a minor scale degree but not a major degree
		expect(q(3, { scaleName: "minor" })).toBe(3);
	});

	it("pentatonic scale snaps to its 5 degrees", () => {
		const degs = [0, 3, 5, 7, 10]; // minor pentatonic
		for (let p = 0; p < 12; p++) {
			const r = q(p, { scaleName: "minor pentatonic" })!;
			expect(degs).toContain(((r % 12) + 12) % 12);
		}
	});

	it("root shifts the scale", () => {
		// C major shifted to root 2 (D major): D scale degree D=2 present
		expect(q(2, { scaleName: "major" }, { root: 2 })).toBe(2);
		// 3 (D#) not in D major → snaps to 2 or 4
		expect([2, 4]).toContain(q(3, { scaleName: "major" }, { root: 2 }));
	});

	it("octave/range fold the pitch into the playable window", () => {
		const d = driver(quantize, { scaleName: "chromatic" });
		// window [octave*12, (octave+range)*12) = [48, 60) for octave 4, range 1
		const out = d.step({ pitch: 100, root: 0, octave: 4, range: 1 }).out;
		expect(out).toBeGreaterThanOrEqual(48);
		expect(out).toBeLessThan(60);
	});

	it("chromatic scale is identity within a wide window", () => {
		for (const p of [0, 1, 5, 11, 13, 24]) {
			expect(q(p, { scaleName: "chromatic" })).toBe(p);
		}
	});

	it("unknown scale name falls back to major (loud-safe default)", () => {
		expect(q(2, { scaleName: "nonexistent" })).toBe(2);
	});
});
