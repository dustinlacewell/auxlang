import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import { parseExpr } from "./parse";
import { createQueryState, query } from "./query";
import type { RuntimePattern } from "./types";

/** Helper to evaluate a pattern string */
function evalPattern(input: string): RuntimePattern {
	return evaluate(parseExpr(input));
}

describe("query", () => {
	describe("basic output", () => {
		it("returns cv/gate/trig arrays", () => {
			const pat = evalPattern("c4");
			const state = createQueryState(pat.voiceCount);
			const out = query(pat, 0, 0, 0, state);

			expect(out.cv).toHaveLength(1);
			expect(out.gate).toHaveLength(1);
			expect(out.trig).toHaveLength(1);
		});

		it("cv is frequency of active note", () => {
			const pat = evalPattern("a4");
			const state = createQueryState(pat.voiceCount);
			const out = query(pat, 0, 0, 0, state);

			expect(out.cv[0]).toBeCloseTo(440, 1);
		});

		it("gate is 1 during note, 0 after 80%", () => {
			const pat = evalPattern("c4");
			const state = createQueryState(pat.voiceCount);

			// At phase 0.5, gate should be 1
			let out = query(pat, 0, 0.5, 0, state);
			expect(out.gate[0]).toBe(1);

			// At phase 0.9, gate should be 0 (past 80%)
			out = query(pat, 0, 0.9, 0, state);
			expect(out.gate[0]).toBe(0);
		});

		it("trig is 1 on note onset", () => {
			const pat = evalPattern("c4 e4");
			const state = createQueryState(pat.voiceCount);

			// First note onset
			let out = query(pat, 0, 0, 0, state);
			expect(out.trig[0]).toBe(1);

			// Same note, no trig
			out = query(pat, 0, 0.5, 0, state);
			expect(out.trig[0]).toBe(0);

			// Second note onset
			out = query(pat, 1, 0, 0, state);
			expect(out.trig[0]).toBe(1);
		});
	});

	describe("rest", () => {
		it("rest produces no gate", () => {
			const pat = evalPattern("~");
			const state = createQueryState(pat.voiceCount);
			const out = query(pat, 0, 0.5, 0, state);

			expect(out.gate[0]).toBe(0);
		});
	});

	describe("multi-voice (stack)", () => {
		it("outputs array per voice", () => {
			const pat = evalPattern("{c4,e4,g4}");
			const state = createQueryState(pat.voiceCount);
			const out = query(pat, 0, 0, 0, state);

			expect(out.cv).toHaveLength(3);
			expect(out.gate).toHaveLength(3);
			expect(out.trig).toHaveLength(3);

			// All gates should be 1 at start
			expect(out.gate[0]).toBe(1);
			expect(out.gate[1]).toBe(1);
			expect(out.gate[2]).toBe(1);
		});

		it("polyrhythm has different gate patterns", () => {
			const pat = evalPattern("{c4 d4, e4}");
			const state = createQueryState(pat.voiceCount);

			// At phase 0.6, voice 0 should be in second note (d4), voice 1 still in e4
			const out = query(pat, 0, 0.6, 0, state);

			// Voice 0: second note starts at 0.5, so at 0.6 we're at phase 0.2 within that note
			expect(out.gate[0]).toBe(1);

			// Voice 1: single note, at 0.6 we're at 60% (before 80%)
			expect(out.gate[1]).toBe(1);
		});
	});

	describe("alternation", () => {
		it("selects event by cycle", () => {
			const pat = evalPattern("<c4 e4>");
			const state = createQueryState(pat.voiceCount);

			// Cycle 0 -> c4
			let out = query(pat, 0, 0, 0, state);
			expect(out.cv[0]).toBeCloseTo(261.63, 1);

			// Cycle 1 -> e4
			out = query(pat, 0, 0, 1, createQueryState(pat.voiceCount));
			expect(out.cv[0]).toBeCloseTo(329.63, 1);
		});
	});

	describe("tie", () => {
		it("tied events have 100% gate duty cycle", () => {
			const pat = evalPattern("c4_e4");
			const state = createQueryState(pat.voiceCount);

			// First half (c4), at 90% of first half - gate should still be 1
			let out = query(pat, 0, 0.45, 0, state);
			expect(out.gate[0]).toBe(1);

			// Second half (e4), at 90% of second half - gate should still be 1
			out = query(pat, 0, 0.95, 0, state);
			expect(out.gate[0]).toBe(1);
		});
	});

	describe("probability", () => {
		it("prob < 1 can result in no gate", () => {
			const pat = evalPattern("c4?0");
			const state = createQueryState(pat.voiceCount);
			const out = query(pat, 0, 0.5, 0, state);

			// With prob 0, gate should always be 0
			expect(out.gate[0]).toBe(0);
		});

		it("prob = 1 always gates", () => {
			const pat = evalPattern("c4?1");
			const state = createQueryState(pat.voiceCount);
			const out = query(pat, 0, 0.5, 0, state);

			expect(out.gate[0]).toBe(1);
		});

		it("prob result is cached within same occurrence", () => {
			const pat = evalPattern("c4?0.5");
			const state = createQueryState(pat.voiceCount);

			// Query multiple times in same beat
			const out1 = query(pat, 0, 0.1, 0, state);
			const out2 = query(pat, 0, 0.5, 0, state);

			// Should get same result
			expect(out1.gate[0]).toBe(out2.gate[0]);
		});
	});

	describe("pattern looping", () => {
		it("wraps beat index for looping", () => {
			const pat = evalPattern("c4 e4");
			const state = createQueryState(pat.voiceCount);

			// Beat 2 should wrap to beat 0
			const out = query(pat, 2, 0, 0, state);
			expect(out.cv[0]).toBeCloseTo(261.63, 1); // c4
		});
	});
});
