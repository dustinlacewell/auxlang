import { describe, expect, it } from "vitest";
import { parseExpr } from "../../devices/seq/expr/parse";
import { clearProbDecisions, countBeats, createTraversalState, traverse } from "../../devices/seq/expr/traverse";
import { voiceCount } from "../../devices/seq/expr/types";

describe("traverse", () => {
	describe("basic notes", () => {
		it("single note outputs cv and gate", () => {
			const expr = parseExpr("c4");
			const state = createTraversalState();
			const output = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);

			expect(output.cv).toHaveLength(1);
			expect(output.cv[0]?.value).toBeCloseTo(261.63, 1);
			expect(output.gate[0]?.value).toBe(1);
		});

		it("note gate goes low at end of beat (0.999)", () => {
			const expr = parseExpr("c4");
			const state = createTraversalState();
			// Gate stays high until 0.999 of the beat (0.001 gap for retriggering)
			const output = traverse(
				expr,
				{ beatIndex: 0, phase: 0.9995, cycle: 0, totalBeats: 1 },
				state,
			);

			expect(output.gate[0]?.value).toBe(0);
		});

		it("rest produces no gate", () => {
			const expr = parseExpr("~");
			const state = createTraversalState();
			const output = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);

			expect(output.gate[0]?.value).toBe(0);
		});
	});

	describe("sequences", () => {
		it("sequence lays out notes sequentially", () => {
			const expr = parseExpr("c4 e4");
			const state = createTraversalState();

			const out1 = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 2 }, state);
			expect(out1.cv[0]?.value).toBeCloseTo(261.63, 1);

			const out2 = traverse(expr, { beatIndex: 1, phase: 0, cycle: 0, totalBeats: 2 }, state);
			expect(out2.cv[0]?.value).toBeCloseTo(329.63, 1);
		});
	});

	describe("groups", () => {
		it("group subdivides duration equally", () => {
			const expr = parseExpr("[c4 e4]");
			const state = createTraversalState();

			const out1 = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);
			expect(out1.cv[0]?.value).toBeCloseTo(261.63, 1);

			const out2 = traverse(expr, { beatIndex: 0, phase: 0.6, cycle: 0, totalBeats: 1 }, state);
			expect(out2.cv[0]?.value).toBeCloseTo(329.63, 1);
		});
	});

	describe("stacks", () => {
		it("stack creates parallel voices", () => {
			const expr = parseExpr("{c4,e4,g4}");
			expect(voiceCount(expr)).toBe(3);

			const state = createTraversalState();
			const output = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);

			expect(output.cv).toHaveLength(3);
			expect(output.cv[0]?.value).toBeCloseTo(261.63, 1);
			expect(output.cv[1]?.value).toBeCloseTo(329.63, 1);
			expect(output.cv[2]?.value).toBeCloseTo(392.0, 1);
		});
	});

	describe("alternation", () => {
		it("alternation selects child based on cycle", () => {
			const expr = parseExpr("<c4 e4>");
			const state = createTraversalState();

			const out1 = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);
			expect(out1.cv[0]?.value).toBeCloseTo(261.63, 1);

			const out2 = traverse(expr, { beatIndex: 0, phase: 0, cycle: 1, totalBeats: 1 }, state);
			expect(out2.cv[0]?.value).toBeCloseTo(329.63, 1);
		});
	});

	describe("probability", () => {
		it("probability ?0 never plays", () => {
			const expr = parseExpr("c4?0");
			const state = createTraversalState();
			const output = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);

			expect(output.gate[0]?.value).toBe(0);
		});

		it("probability ?1 always plays", () => {
			const expr = parseExpr("c4?1");
			const state = createTraversalState();
			const output = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);

			expect(output.gate[0]?.value).toBe(1);
		});

		it("stack with probability rolls once for all voices", () => {
			const expr = parseExpr("{c4,e4,g4}?0");
			const state = createTraversalState();
			const output = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);

			expect(output.gate[0]?.value).toBe(0);
			expect(output.gate[1]?.value).toBe(0);
			expect(output.gate[2]?.value).toBe(0);
		});

		it("stack with probability ?1 all voices play", () => {
			const expr = parseExpr("{c4,e4,g4}?1");
			const state = createTraversalState();
			const output = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);

			expect(output.gate[0]?.value).toBe(1);
			expect(output.gate[1]?.value).toBe(1);
			expect(output.gate[2]?.value).toBe(1);
		});

		it("probability decision persists across samples in same cycle", () => {
			const expr = parseExpr("c4?0.5");
			const state = createTraversalState();

			const out1 = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);
			const out2 = traverse(expr, { beatIndex: 0, phase: 0.5, cycle: 0, totalBeats: 1 }, state);

			expect(out1.gate[0]?.value).toBe(out2.gate[0]?.value);
		});

		it("probability re-rolls on new cycle", () => {
			const expr = parseExpr("c4?0");
			const state = createTraversalState();

			traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);

			clearProbDecisions(state);

			const out2 = traverse(expr, { beatIndex: 0, phase: 0, cycle: 1, totalBeats: 1 }, state);
			expect(out2.gate[0]?.value).toBe(0);
		});
	});

	describe("modifiers", () => {
		it("multiply repeats within beat", () => {
			const expr = parseExpr("c4*2");
			expect(countBeats(expr)).toBe(1);

			const state = createTraversalState();
			const out1 = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);
			expect(out1.gate[0]?.value).toBe(1);

			const out2 = traverse(expr, { beatIndex: 0, phase: 0.6, cycle: 0, totalBeats: 1 }, state);
			expect(out2.gate[0]?.value).toBe(1);
		});

		it("replicate extends duration", () => {
			const expr = parseExpr("c4!2");
			expect(countBeats(expr)).toBe(2);
		});

		it("elongate extends duration", () => {
			const expr = parseExpr("c4@3");
			expect(countBeats(expr)).toBe(3);
		});
	});

	describe("trigger detection", () => {
		it("trigger fires on note onset", () => {
			const expr = parseExpr("c4");
			const state = createTraversalState();

			const out1 = traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);
			expect(out1.trig[0]?.value).toBe(1);

			const out2 = traverse(expr, { beatIndex: 0, phase: 0.5, cycle: 0, totalBeats: 1 }, state);
			expect(out2.trig[0]?.value).toBe(0);
		});

		it("trigger fires again on new cycle", () => {
			const expr = parseExpr("c4");
			const state = createTraversalState();

			traverse(expr, { beatIndex: 0, phase: 0, cycle: 0, totalBeats: 1 }, state);
			traverse(expr, { beatIndex: 0, phase: 0.5, cycle: 0, totalBeats: 1 }, state);

			clearProbDecisions(state);
			const out3 = traverse(expr, { beatIndex: 0, phase: 0, cycle: 1, totalBeats: 1 }, state);
			expect(out3.trig[0]?.value).toBe(1);
		});
	});
});
