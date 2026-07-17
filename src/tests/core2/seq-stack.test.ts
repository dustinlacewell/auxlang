/**
 * Tests for seq device stack/chord behavior and pattern highlighting.
 */

import { describe, it, expect } from "vitest";
import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { decomposePattern } from "@/core2/devices/seq/voices/decompose";
import { countBeats } from "@/core2/devices/seq/traverse/count-beats";
import { buildEvents } from "@/core2/devices/seq/events/build-events";
import { lookupEvent } from "@/core2/devices/seq/events/lookup-event";
import { extractPositionsForBeat } from "@/core2/devices/seq/visitors/extract-positions";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";

describe("seq stack behavior", () => {
	describe("sequences inside stacks become alternations", () => {
		it("decomposes stack with sequences into alt voices", () => {
			const expr = parseExpr("{c4 c3, e4 f4}");
			const monos = decomposePattern(expr, "isolate");

			// Voice 0 is rest (base voice)
			expect(monos[0]!.type).toBe("rest");
			// Voices 1 and 2 should be alts, not seqs
			expect(monos[1]!.type).toBe("alt");
			expect(monos[2]!.type).toBe("alt");
		});

		it("alternates notes per cycle, not per beat", () => {
			const expr = parseExpr("{c4 c3, e4 f4}");
			const monos = decomposePattern(expr, "isolate");

			// Voice 1: c4 on cycle 0, c3 on cycle 1
			const state1 = createTraversalState();
			const v1c0 = buildEvents(monos[1]!, state1, 0);
			const v1c1 = buildEvents(monos[1]!, state1, 1);
			expect(v1c0.map((e: { freq: number }) => Math.round(e.freq))).toEqual([262]); // c4
			expect(v1c1.map((e: { freq: number }) => Math.round(e.freq))).toEqual([131]); // c3

			// Voice 2: e4 on cycle 0, f4 on cycle 1
			const state2 = createTraversalState();
			const v2c0 = buildEvents(monos[2]!, state2, 0);
			const v2c1 = buildEvents(monos[2]!, state2, 1);
			expect(v2c0.map((e: { freq: number }) => Math.round(e.freq))).toEqual([330]); // e4
			expect(v2c1.map((e: { freq: number }) => Math.round(e.freq))).toEqual([349]); // f4
		});

		it("handles nested groups within stack sequences", () => {
			const expr = parseExpr("{c4 c3, e4 [e3 f3], g4 g3}");
			const monos = decomposePattern(expr, "isolate");

			// Voice with [e3 f3] should still be an alt
			expect(monos[2]!.type).toBe("alt");

			// On cycle 1, the group [e3 f3] plays both notes within the beat
			const state = createTraversalState();
			buildEvents(monos[2]!, state, 0); // cycle 0 first
			const v2c1 = buildEvents(monos[2]!, state, 1);
			// Group contains two notes that play in sequence within the beat
			expect(v2c1.length).toBe(2);
		});
	});

	describe("stack beat counting", () => {
		it("stack has 1 beat regardless of child lengths", () => {
			expect(countBeats(parseExpr("{c4, e4}"))).toBe(1);
			expect(countBeats(parseExpr("{c4 c3, e4 f4}"))).toBe(1);
			expect(countBeats(parseExpr("{c4 c3 c2, e4}"))).toBe(1);
		});

		it("explicit alt inside stack also has 1 beat", () => {
			expect(countBeats(parseExpr("{<c4 c3>, <e4 f4>}"))).toBe(1);
		});
	});
});

describe("pattern highlighting", () => {
	describe("extractPositionsForBeat", () => {
		it("extracts correct positions for simple pattern", () => {
			const pattern = "c4 e4 g4";
			const expr = parseExpr(pattern);

			const pos0 = extractPositionsForBeat(expr, pattern, 0, 0);
			const pos1 = extractPositionsForBeat(expr, pattern, 1, 0);
			const pos2 = extractPositionsForBeat(expr, pattern, 2, 0);

			expect(pos0.map(p => pattern.slice(p.start, p.end))).toEqual(["c4"]);
			expect(pos1.map(p => pattern.slice(p.start, p.end))).toEqual(["e4"]);
			expect(pos2.map(p => pattern.slice(p.start, p.end))).toEqual(["g4"]);
		});

		it("extracts all notes in a chord/stack", () => {
			const pattern = "{c4, e4, g4}";
			const expr = parseExpr(pattern);

			const pos = extractPositionsForBeat(expr, pattern, 0, 0);
			const notes = pos.map(p => pattern.slice(p.start, p.end));

			expect(notes).toContain("c4");
			expect(notes).toContain("e4");
			expect(notes).toContain("g4");
		});

		it("alternates stack sequence positions per cycle", () => {
			const pattern = "{c4 c3, e4 f4}";
			const expr = parseExpr(pattern);

			const cycle0 = extractPositionsForBeat(expr, pattern, 0, 0);
			const cycle1 = extractPositionsForBeat(expr, pattern, 0, 1);

			const notes0 = cycle0.map(p => pattern.slice(p.start, p.end));
			const notes1 = cycle1.map(p => pattern.slice(p.start, p.end));

			expect(notes0).toContain("c4");
			expect(notes0).toContain("e4");
			expect(notes1).toContain("c3");
			expect(notes1).toContain("f4");
		});

		it("respects probability decisions", () => {
			const pattern = "c4 e4?";
			const expr = parseExpr(pattern);

			// With prob=true, note shows
			const stateTrue = createTraversalState();
			stateTrue.probDecisions["root.seq1.maybe:0"] = true;
			const posTrue = extractPositionsForBeat(expr, pattern, 1, 0, stateTrue);
			expect(posTrue.map(p => pattern.slice(p.start, p.end))).toContain("e4");

			// With prob=false, note hidden
			const stateFalse = createTraversalState();
			stateFalse.probDecisions["root.seq1.maybe:0"] = false;
			const posFalse = extractPositionsForBeat(expr, pattern, 1, 0, stateFalse);
			expect(posFalse.map(p => pattern.slice(p.start, p.end))).not.toContain("e4");
		});
	});

	describe("sub-beat precision", () => {
		it("extracts correct note at fractional beat position", () => {
			const pattern = "[c4 e4]";
			const expr = parseExpr(pattern);

			const pos0 = extractPositionsForBeat(expr, pattern, 0, 0);
			const pos05 = extractPositionsForBeat(expr, pattern, 0.5, 0);

			expect(pos0.map(p => pattern.slice(p.start, p.end))).toContain("c4");
			expect(pos05.map(p => pattern.slice(p.start, p.end))).toContain("e4");
		});
	});
});
