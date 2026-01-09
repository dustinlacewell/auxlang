import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import { parseExpr } from "./parse";
import type { RuntimePattern, VoiceEvent } from "./types";

/** Helper to evaluate a pattern string */
function evalPattern(input: string): RuntimePattern {
	return evaluate(parseExpr(input));
}

/** Helper to get events for a specific voice */
function voiceEvents(pattern: RuntimePattern, voiceId: number): VoiceEvent[] {
	return pattern.events.filter(e => e.voiceId === voiceId);
}

describe("evaluate", () => {
	describe("atoms", () => {
		it("single note = 1 beat, 1 voice", () => {
			const pat = evalPattern("c4");
			expect(pat.totalBeats).toBe(1);
			expect(pat.voiceCount).toBe(1);
			expect(pat.events).toHaveLength(1);
			expect(pat.events[0]?.freq).toBeCloseTo(261.63, 1);
			expect(pat.events[0]?.beatStart).toBe(0);
			expect(pat.events[0]?.beatEnd).toBe(1);
		});

		it("rest = 1 beat, no events", () => {
			const pat = evalPattern("~");
			expect(pat.totalBeats).toBe(1);
			expect(pat.voiceCount).toBe(1);
			expect(pat.events).toHaveLength(0);
		});
	});

	describe("sequences", () => {
		it("sequence of notes = n beats", () => {
			const pat = evalPattern("c4 e4 g4");
			expect(pat.totalBeats).toBe(3);
			expect(pat.voiceCount).toBe(1);
			expect(pat.events).toHaveLength(3);

			expect(pat.events[0]?.beatStart).toBe(0);
			expect(pat.events[0]?.beatEnd).toBe(1);

			expect(pat.events[1]?.beatStart).toBe(1);
			expect(pat.events[1]?.beatEnd).toBe(2);

			expect(pat.events[2]?.beatStart).toBe(2);
			expect(pat.events[2]?.beatEnd).toBe(3);
		});

		it("sequence with rests", () => {
			const pat = evalPattern("c4 ~ e4");
			expect(pat.totalBeats).toBe(3);
			expect(pat.events).toHaveLength(2); // No event for rest
		});
	});

	describe("group [...]", () => {
		it("group subdivides single beat", () => {
			const pat = evalPattern("[c4 e4]");
			expect(pat.totalBeats).toBe(1);
			expect(pat.events).toHaveLength(2);

			expect(pat.events[0]?.beatStart).toBe(0);
			expect(pat.events[0]?.beatEnd).toBe(0.5);

			expect(pat.events[1]?.beatStart).toBe(0.5);
			expect(pat.events[1]?.beatEnd).toBe(1);
		});

		it("nested groups subdivide further", () => {
			const pat = evalPattern("[[c4 e4] g4]");
			expect(pat.totalBeats).toBe(1);
			expect(pat.events).toHaveLength(3);

			expect(pat.events[0]?.beatEnd).toBe(0.25);
			expect(pat.events[1]?.beatStart).toBe(0.25);
			expect(pat.events[1]?.beatEnd).toBe(0.5);
			expect(pat.events[2]?.beatStart).toBe(0.5);
		});
	});

	describe("alternation <...>", () => {
		it("alternation has cycle tags", () => {
			const pat = evalPattern("<c4 e4>");
			expect(pat.totalBeats).toBe(1);
			expect(pat.events).toHaveLength(2);

			expect(pat.events[0]?.cycle).toBe(0);
			expect(pat.events[0]?.cycleTotal).toBe(2);

			expect(pat.events[1]?.cycle).toBe(1);
			expect(pat.events[1]?.cycleTotal).toBe(2);
		});
	});

	describe("stack {...}", () => {
		it("stack creates voices", () => {
			const pat = evalPattern("{c4,e4,g4}");
			expect(pat.totalBeats).toBe(1);
			expect(pat.voiceCount).toBe(3);
			expect(pat.events).toHaveLength(3);

			expect(pat.events[0]?.voiceId).toBe(0);
			expect(pat.events[1]?.voiceId).toBe(1);
			expect(pat.events[2]?.voiceId).toBe(2);
		});

		it("stack with sequences - polyrhythm", () => {
			const pat = evalPattern("{c4 d4, e4}");
			expect(pat.voiceCount).toBe(2);

			const voice0 = voiceEvents(pat, 0);
			const voice1 = voiceEvents(pat, 1);

			// Voice 0 subdivides into 2 notes
			expect(voice0).toHaveLength(2);
			expect(voice0[0]?.beatEnd).toBe(0.5);
			expect(voice0[1]?.beatStart).toBe(0.5);

			// Voice 1 holds for full duration
			expect(voice1).toHaveLength(1);
			expect(voice1[0]?.beatStart).toBe(0);
			expect(voice1[0]?.beatEnd).toBe(1);
		});

		it("nested stacks flatten voices", () => {
			const pat = evalPattern("{c4, {a4, b4}, g4}");
			expect(pat.voiceCount).toBe(4);

			expect(pat.events[0]?.voiceId).toBe(0); // c4
			expect(pat.events[1]?.voiceId).toBe(1); // a4
			expect(pat.events[2]?.voiceId).toBe(2); // b4
			expect(pat.events[3]?.voiceId).toBe(3); // g4
		});

		it("3:2 polyrhythm", () => {
			const pat = evalPattern("{c4 d4 e4, f4 g4}");
			expect(pat.voiceCount).toBe(2);

			const voice0 = voiceEvents(pat, 0);
			const voice1 = voiceEvents(pat, 1);

			// Voice 0: 3 notes, each 1/3 duration
			expect(voice0).toHaveLength(3);
			expect(voice0[0]?.beatEnd).toBeCloseTo(1 / 3, 5);
			expect(voice0[1]?.beatStart).toBeCloseTo(1 / 3, 5);
			expect(voice0[2]?.beatStart).toBeCloseTo(2 / 3, 5);

			// Voice 1: 2 notes, each 1/2 duration
			expect(voice1).toHaveLength(2);
			expect(voice1[0]?.beatEnd).toBe(0.5);
			expect(voice1[1]?.beatStart).toBe(0.5);
		});
	});

	describe("tie _", () => {
		it("tie marks events as tied", () => {
			const pat = evalPattern("c4_e4");
			expect(pat.totalBeats).toBe(1);
			expect(pat.events).toHaveLength(2);

			expect(pat.events[0]?.tied).toBe(true);
			expect(pat.events[0]?.beatEnd).toBe(0.5);

			expect(pat.events[1]?.tied).toBe(true);
			expect(pat.events[1]?.beatStart).toBe(0.5);
		});

		it("tie between stacks", () => {
			const pat = evalPattern("{c4,e4}_{g4,a4}");
			expect(pat.voiceCount).toBe(2);

			const voice0 = voiceEvents(pat, 0);
			const voice1 = voiceEvents(pat, 1);

			expect(voice0).toHaveLength(2);
			expect(voice0[0]?.tied).toBe(true);
			expect(voice0[1]?.tied).toBe(true);

			expect(voice1).toHaveLength(2);
			expect(voice1[0]?.tied).toBe(true);
			expect(voice1[1]?.tied).toBe(true);
		});
	});

	describe("multiply *n", () => {
		it("multiply subdivides duration", () => {
			const pat = evalPattern("c4*3");
			expect(pat.totalBeats).toBe(1);
			expect(pat.events).toHaveLength(3);

			expect(pat.events[0]?.beatEnd).toBeCloseTo(1 / 3, 5);
			expect(pat.events[1]?.beatStart).toBeCloseTo(1 / 3, 5);
			expect(pat.events[2]?.beatStart).toBeCloseTo(2 / 3, 5);
		});
	});

	describe("replicate !n", () => {
		it("replicate expands to n beats", () => {
			const pat = evalPattern("c4!3");
			expect(pat.totalBeats).toBe(3);
			expect(pat.events).toHaveLength(3);

			expect(pat.events[0]?.beatStart).toBe(0);
			expect(pat.events[0]?.beatEnd).toBe(1);

			expect(pat.events[1]?.beatStart).toBe(1);
			expect(pat.events[2]?.beatStart).toBe(2);
		});
	});

	describe("elongate @n", () => {
		it("elongate stretches duration", () => {
			const pat = evalPattern("c4@3");
			expect(pat.totalBeats).toBe(3);
			expect(pat.events).toHaveLength(1);

			expect(pat.events[0]?.beatStart).toBe(0);
			expect(pat.events[0]?.beatEnd).toBe(3);
		});

		it("group elongate stretches subdivisions", () => {
			const pat = evalPattern("[c4 e4]@2");
			expect(pat.totalBeats).toBe(2);
			expect(pat.events).toHaveLength(2);

			expect(pat.events[0]?.beatStart).toBe(0);
			expect(pat.events[0]?.beatEnd).toBe(1);

			expect(pat.events[1]?.beatStart).toBe(1);
			expect(pat.events[1]?.beatEnd).toBe(2);
		});
	});

	describe("euclidean (k,n)", () => {
		it("euclidean distributes hits", () => {
			const pat = evalPattern("c4(3,8)");
			expect(pat.totalBeats).toBe(8);

			// Euclidean(3,8) = [x . . x . . x .]
			const hitBeats = pat.events.map(e => e.beatStart);
			expect(hitBeats).toHaveLength(3);
		});
	});

	describe("maybe ?", () => {
		it("maybe attaches probability", () => {
			const pat = evalPattern("c4?0.3");
			expect(pat.events).toHaveLength(1);
			expect(pat.events[0]?.prob).toBe(0.3);
		});

		it("chained maybe multiplies probabilities", () => {
			const pat = evalPattern("c4?0.5?0.5");
			expect(pat.events[0]?.prob).toBe(0.25);
		});

		it("nested maybe in stack", () => {
			const pat = evalPattern("{c4,e4}?0.3");
			expect(pat.events).toHaveLength(2);
			expect(pat.events[0]?.prob).toBe(0.3);
			expect(pat.events[1]?.prob).toBe(0.3);
		});
	});

	describe("modifier order", () => {
		it("multiply then elongate", () => {
			const pat = evalPattern("c4*2@3");
			// *2 within 1 beat, @3 stretches to 3 beats
			// Result: 2 notes across 3 beats = each 1.5 beats
			expect(pat.totalBeats).toBe(3);
			expect(pat.events).toHaveLength(2);
			expect(pat.events[0]?.beatEnd).toBe(1.5);
			expect(pat.events[1]?.beatStart).toBe(1.5);
		});

		it("replicate then multiply", () => {
			const pat = evalPattern("c4!2*3");
			// !2 = 2 beats, *3 = each beat tripled
			expect(pat.totalBeats).toBe(2);
			expect(pat.events).toHaveLength(6);
		});
	});

	describe("complex patterns", () => {
		it("stack with alternation", () => {
			const pat = evalPattern("{<c4 e4>, g4}");
			expect(pat.voiceCount).toBe(2);

			const voice0 = voiceEvents(pat, 0);
			const voice1 = voiceEvents(pat, 1);

			// Voice 0 has 2 events (one per cycle)
			expect(voice0).toHaveLength(2);
			expect(voice0[0]?.cycle).toBe(0);
			expect(voice0[1]?.cycle).toBe(1);

			// Voice 1 always plays (no cycle)
			expect(voice1).toHaveLength(1);
			expect(voice1[0]?.cycle).toBeUndefined();
		});
	});
});
