import { describe, expect, it } from "vitest";
import { parse } from "./parse";

/**
 * Helper to flatten beats into steps for easier testing of step properties
 */
function flattenBeats(beats: ReturnType<typeof parse>) {
	return beats.flat();
}

describe("parse", () => {
	describe("beat structure", () => {
		it("parses a single note as one beat", () => {
			const pattern = parse("c4");
			expect(pattern).toHaveLength(1); // 1 beat
			expect(pattern[0]).toHaveLength(1); // 1 step in beat
			expect(pattern[0]?.[0]?.type).toBe("note");
			expect(pattern[0]?.[0]?.dur).toBe(1);
			if (pattern[0]?.[0]?.type === "note") {
				expect(pattern[0][0].freq).toBeCloseTo(261.63, 1);
			}
		});

		it("parses multiple notes as multiple beats", () => {
			const pattern = parse("c4 e4 g4");
			expect(pattern).toHaveLength(3); // 3 beats
			expect(pattern[0]).toHaveLength(1); // 1 step per beat
			expect(pattern[1]).toHaveLength(1);
			expect(pattern[2]).toHaveLength(1);
			expect(pattern.every(beat => beat[0]?.type === "note")).toBe(true);
			expect(pattern.every(beat => beat[0]?.dur === 1)).toBe(true);
		});

		it("parses a group as one beat with subdivided steps", () => {
			const pattern = parse("[c4 e4]");
			expect(pattern).toHaveLength(1); // 1 beat
			expect(pattern[0]).toHaveLength(2); // 2 steps in beat
			expect(pattern[0]?.[0]?.dur).toBe(0.5);
			expect(pattern[0]?.[1]?.dur).toBe(0.5);
		});

		it("parses mixed notes and groups correctly", () => {
			const pattern = parse("c4 [e4 g4] c5");
			expect(pattern).toHaveLength(3); // 3 beats

			// c4: beat with 1 step, dur=1
			expect(pattern[0]).toHaveLength(1);
			expect(pattern[0]?.[0]?.dur).toBe(1);

			// [e4 g4]: beat with 2 steps, dur=0.5 each
			expect(pattern[1]).toHaveLength(2);
			expect(pattern[1]?.[0]?.dur).toBe(0.5);
			expect(pattern[1]?.[1]?.dur).toBe(0.5);

			// c5: beat with 1 step, dur=1
			expect(pattern[2]).toHaveLength(1);
			expect(pattern[2]?.[0]?.dur).toBe(1);
		});
	});

	describe("basic parsing", () => {
		it("parses notes with accidentals", () => {
			const pattern = parse("c#4 db4");
			expect(pattern).toHaveLength(2);
			const step0 = pattern[0]?.[0];
			const step1 = pattern[1]?.[0];
			if (step0?.type === "note" && step1?.type === "note") {
				// C#4 and Db4 should be the same frequency
				expect(step0.freq).toBeCloseTo(step1.freq, 5);
			}
		});

		it("parses notes without octave (defaults to 4)", () => {
			const pattern = parse("c e g");
			expect(pattern).toHaveLength(3);
			const step = pattern[0]?.[0];
			if (step?.type === "note") {
				expect(step.freq).toBeCloseTo(261.63, 1); // C4
			}
		});

		it("parses rests", () => {
			const pattern = parse("c4 ~ e4");
			expect(pattern).toHaveLength(3);
			expect(pattern[0]?.[0]?.type).toBe("note");
			expect(pattern[1]?.[0]?.type).toBe("rest");
			expect(pattern[2]?.[0]?.type).toBe("note");
			expect(pattern[1]?.[0]?.dur).toBe(1);
		});

		it("handles empty input", () => {
			const pattern = parse("");
			expect(pattern).toHaveLength(0);
		});

		it("throws on unmatched left bracket", () => {
			expect(() => parse("[c4 e4")).toThrow();
		});

		it("throws on unmatched right bracket", () => {
			expect(() => parse("c4 e4]")).toThrow();
		});

		it("handles uppercase notes", () => {
			const lower = parse("c4");
			const upper = parse("C4");
			const lowerStep = lower[0]?.[0];
			const upperStep = upper[0]?.[0];
			if (lowerStep?.type === "note" && upperStep?.type === "note") {
				expect(lowerStep.freq).toBe(upperStep.freq);
			}
		});
	});

	describe("groups", () => {
		it("parses groups with three items", () => {
			const pattern = parse("[c4 e4 g4]");
			expect(pattern).toHaveLength(1); // 1 beat
			expect(pattern[0]).toHaveLength(3); // 3 steps
			expect(pattern[0]?.[0]?.dur).toBeCloseTo(1 / 3, 5);
			expect(pattern[0]?.[1]?.dur).toBeCloseTo(1 / 3, 5);
			expect(pattern[0]?.[2]?.dur).toBeCloseTo(1 / 3, 5);
		});

		it("parses nested groups", () => {
			const pattern = parse("[[c4 e4]]");
			expect(pattern).toHaveLength(1); // 1 beat
			// Outer group has 1 item, inner has 2
			expect(pattern[0]).toHaveLength(2);
			expect(pattern[0]?.[0]?.dur).toBe(0.5);
			expect(pattern[0]?.[1]?.dur).toBe(0.5);
		});

		it("parses groups with rests", () => {
			const pattern = parse("[c4 ~]");
			expect(pattern).toHaveLength(1); // 1 beat
			expect(pattern[0]).toHaveLength(2); // 2 steps
			expect(pattern[0]?.[0]?.type).toBe("note");
			expect(pattern[0]?.[1]?.type).toBe("rest");
			expect(pattern[0]?.[0]?.dur).toBe(0.5);
			expect(pattern[0]?.[1]?.dur).toBe(0.5);
		});

		it("parses deeply nested groups", () => {
			const pattern = parse("[c4 [e4 [g4 b4]]]");
			expect(pattern).toHaveLength(1); // 1 beat
			// c4 (0.5), e4 (0.25), g4 (0.125), b4 (0.125)
			expect(pattern[0]).toHaveLength(4);
			expect(pattern[0]?.[0]?.dur).toBe(0.5);
			expect(pattern[0]?.[1]?.dur).toBe(0.25);
			expect(pattern[0]?.[2]?.dur).toBe(0.125);
			expect(pattern[0]?.[3]?.dur).toBe(0.125);
		});
	});

	describe("realistic patterns", () => {
		it("parses a realistic pattern", () => {
			const pattern = parse("c3 e3 g3 [c4 e4] g4 ~ c5");
			expect(pattern).toHaveLength(7); // 7 beats

			// Check beat structure
			expect(pattern[0]?.[0]?.type).toBe("note"); // c3
			expect(pattern[1]?.[0]?.type).toBe("note"); // e3
			expect(pattern[2]?.[0]?.type).toBe("note"); // g3
			expect(pattern[3]).toHaveLength(2); // [c4 e4] - 2 steps in 1 beat
			expect(pattern[4]?.[0]?.type).toBe("note"); // g4
			expect(pattern[5]?.[0]?.type).toBe("rest"); // ~
			expect(pattern[6]?.[0]?.type).toBe("note"); // c5

			// Check durations
			expect(pattern[0]?.[0]?.dur).toBe(1);
			expect(pattern[3]?.[0]?.dur).toBe(0.5);
			expect(pattern[3]?.[1]?.dur).toBe(0.5);
			expect(pattern[5]?.[0]?.dur).toBe(1);
		});
	});

	describe("multiply (*n)", () => {
		it("subdivides a note within one beat", () => {
			const pattern = parse("c4*2");
			expect(pattern).toHaveLength(1); // 1 beat
			expect(pattern[0]).toHaveLength(2); // 2 subdivided steps
			expect(pattern[0]?.[0]?.dur).toBe(0.5);
			expect(pattern[0]?.[1]?.dur).toBe(0.5);
			expect(pattern[0]?.[0]?.type).toBe("note");
			expect(pattern[0]?.[1]?.type).toBe("note");
		});

		it("works with *3", () => {
			const pattern = parse("c4*3");
			expect(pattern).toHaveLength(1); // 1 beat
			expect(pattern[0]).toHaveLength(3);
			expect(pattern[0]?.[0]?.dur).toBeCloseTo(1 / 3, 5);
		});

		it("works in a sequence", () => {
			const pattern = parse("c4 e4*2 g4");
			expect(pattern).toHaveLength(3); // 3 beats
			expect(pattern[0]).toHaveLength(1); // c4
			expect(pattern[1]).toHaveLength(2); // e4*2 subdivided
			expect(pattern[2]).toHaveLength(1); // g4
			expect(pattern[0]?.[0]?.dur).toBe(1);
			expect(pattern[1]?.[0]?.dur).toBe(0.5);
			expect(pattern[1]?.[1]?.dur).toBe(0.5);
			expect(pattern[2]?.[0]?.dur).toBe(1);
		});

		it("works on groups", () => {
			const pattern = parse("[c4 e4]*2");
			expect(pattern).toHaveLength(1); // 1 beat
			expect(pattern[0]).toHaveLength(4); // [c4 e4] repeated twice
			expect(pattern[0]?.[0]?.dur).toBe(0.25);
		});
	});

	describe("replicate (!n)", () => {
		it("expands to n separate beats", () => {
			const pattern = parse("c4!3");
			expect(pattern).toHaveLength(3); // 3 beats
			// Each beat has full duration
			expect(pattern[0]?.[0]?.dur).toBe(1);
			expect(pattern[1]?.[0]?.dur).toBe(1);
			expect(pattern[2]?.[0]?.dur).toBe(1);
		});

		it("works in a sequence", () => {
			const pattern = parse("c4 e4!2 g4");
			expect(pattern).toHaveLength(4); // c4, e4, e4, g4
			expect(pattern.every(beat => beat[0]?.dur === 1)).toBe(true);
		});
	});

	describe("elongate (@n)", () => {
		it("creates n beats with tie markers", () => {
			const pattern = parse("c4@2");
			expect(pattern).toHaveLength(2); // 2 beats
			expect(pattern[0]?.[0]?.dur).toBe(1);
			expect(pattern[1]?.[0]?.dur).toBe(1);
			// First beat is normal, second is tied
			expect(pattern[0]?.[0]?.tie).toBeUndefined();
			expect(pattern[1]?.[0]?.tie).toBe(true);
		});

		it("works in a sequence", () => {
			const pattern = parse("c4 e4@2 g4");
			expect(pattern).toHaveLength(4); // c4, e4, e4(tied), g4
			expect(pattern[0]?.[0]?.dur).toBe(1);
			expect(pattern[1]?.[0]?.dur).toBe(1);
			expect(pattern[2]?.[0]?.dur).toBe(1);
			expect(pattern[2]?.[0]?.tie).toBe(true);
			expect(pattern[3]?.[0]?.dur).toBe(1);
		});

		it("within a group extends duration", () => {
			// @n within a group extends the duration within the beat
			const pattern = parse("[c4@2 e4]");
			expect(pattern).toHaveLength(1); // 1 beat
			// c4 takes 2/3, e4 takes 1/3 (c4@2 means 2 slots out of 3)
			expect(pattern[0]).toHaveLength(2);
			expect(pattern[0]?.[0]?.dur).toBeCloseTo(2 / 3, 5);
			expect(pattern[0]?.[1]?.dur).toBeCloseTo(1 / 3, 5);
		});
	});

	describe("euclidean (k,n)", () => {
		it("generates euclidean rhythm (3,8)", () => {
			const pattern = parse("c4(3,8)");
			expect(pattern).toHaveLength(8); // 8 beats
			const hits = pattern.filter(beat => beat[0]?.type === "note");
			const rests = pattern.filter(beat => beat[0]?.type === "rest");
			expect(hits).toHaveLength(3);
			expect(rests).toHaveLength(5);
			expect(pattern[0]?.[0]?.dur).toBe(1); // Each beat has dur=1
		});

		it("generates euclidean rhythm (4,8) - even spacing", () => {
			const pattern = parse("c4(4,8)");
			expect(pattern).toHaveLength(8);
			const hits = pattern.filter(beat => beat[0]?.type === "note");
			expect(hits).toHaveLength(4);
		});

		it("handles edge case (0,4)", () => {
			const pattern = parse("c4(0,4)");
			expect(pattern).toHaveLength(4);
			expect(pattern.every(beat => beat[0]?.type === "rest")).toBe(true);
		});

		it("handles edge case (4,4)", () => {
			const pattern = parse("c4(4,4)");
			expect(pattern).toHaveLength(4);
			expect(pattern.every(beat => beat[0]?.type === "note")).toBe(true);
		});
	});

	describe("alternation (<a b>)", () => {
		it("creates one beat with cycle-tagged steps", () => {
			const pattern = parse("<c4 e4>");
			expect(pattern).toHaveLength(1); // 1 beat
			expect(pattern[0]).toHaveLength(2); // 2 steps (filtered at runtime)
			expect(pattern[0]?.[0]?.cycle).toBe(0);
			expect(pattern[0]?.[0]?.cycleTotal).toBe(2);
			expect(pattern[0]?.[1]?.cycle).toBe(1);
			expect(pattern[0]?.[1]?.cycleTotal).toBe(2);
		});

		it("works with three alternatives", () => {
			const pattern = parse("<c4 e4 g4>");
			expect(pattern).toHaveLength(1); // 1 beat
			expect(pattern[0]).toHaveLength(3);
			expect(pattern[0]?.[0]?.cycleTotal).toBe(3);
			expect(pattern[0]?.[1]?.cycleTotal).toBe(3);
			expect(pattern[0]?.[2]?.cycleTotal).toBe(3);
		});

		it("works in a sequence", () => {
			const pattern = parse("a4 <c4 e4> g4");
			expect(pattern).toHaveLength(3); // 3 beats
			// a4 and g4 have no cycle info
			expect(pattern[0]?.[0]?.cycle).toBeUndefined();
			expect(pattern[2]?.[0]?.cycle).toBeUndefined();
			// <c4 e4> is one beat with 2 cycle-tagged steps
			expect(pattern[1]).toHaveLength(2);
			expect(pattern[1]?.[0]?.cycle).toBe(0);
			expect(pattern[1]?.[1]?.cycle).toBe(1);
		});

		it("can contain groups", () => {
			const pattern = parse("<[c4 e4] g4>");
			expect(pattern).toHaveLength(1); // 1 beat
			// [c4 e4] expands to 2 steps (cycle 0), g4 is 1 step (cycle 1)
			expect(pattern[0]).toHaveLength(3);
			expect(pattern[0]?.[0]?.cycle).toBe(0);
			expect(pattern[0]?.[1]?.cycle).toBe(0);
			expect(pattern[0]?.[2]?.cycle).toBe(1);
		});
	});

	describe("combined operators", () => {
		it("handles nested groups with multiply", () => {
			const pattern = parse("[c4*2 e4]");
			expect(pattern).toHaveLength(1); // 1 beat
			// c4*2 (2 steps, 0.25 each) + e4 (1 step, 0.5)
			expect(pattern[0]).toHaveLength(3);
		});

		it("handles alternation with multiply", () => {
			const pattern = parse("<c4*2 e4>");
			expect(pattern).toHaveLength(1); // 1 beat
			// c4*2 (2 steps, cycle 0) + e4 (1 step, cycle 1)
			expect(pattern[0]).toHaveLength(3);
		});
	});
});
