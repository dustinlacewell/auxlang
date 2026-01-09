import { describe, expect, it } from "vitest";
import { seqExpr } from "./seq-expr";

/** Helper to get the process function and config from a device descriptor */
function getProcessAndConfig(patternString: string) {
	const s = seqExpr(patternString);
	const process = s._state.spec.process;
	const patternDef = s._state.spec.config.pattern;
	if (!patternDef) throw new Error("Expected pattern config");
	const config = { pattern: patternDef.default };
	return { process, config, descriptor: s };
}

describe("seqExpr device", () => {
	const SAMPLE_RATE = 44100;

	describe("basic functionality", () => {
		it("creates device with cv/gate/trig outputs", () => {
			const { descriptor } = getProcessAndConfig("c4");
			expect(descriptor._state.spec.outputs).toEqual(["cv", "gate", "trig"]);
		});

		it("outputs arrays for single note", () => {
			const { process, config } = getProcessAndConfig("c4");
			const state: Record<string, unknown> = {};

			// Send reset signal (-bpm)
			const out = process({ clk: [-120] }, config, state, SAMPLE_RATE);

			expect(Array.isArray(out.cv)).toBe(true);
			expect(Array.isArray(out.gate)).toBe(true);
			expect(Array.isArray(out.trig)).toBe(true);
			expect(out.cv).toHaveLength(1);
		});

		it("cv contains frequency", () => {
			const { process, config } = getProcessAndConfig("a4");
			const state: Record<string, unknown> = {};

			process({ clk: [-120] }, config, state, SAMPLE_RATE);
			const out = process({ clk: [1] }, config, state, SAMPLE_RATE);

			expect(out.cv[0]).toBeCloseTo(440, 1);
		});

		it("gate is 1 at start of note", () => {
			const { process, config } = getProcessAndConfig("c4");
			const state: Record<string, unknown> = {};

			process({ clk: [-120] }, config, state, SAMPLE_RATE);
			const out = process({ clk: [1] }, config, state, SAMPLE_RATE);

			expect(out.gate[0]).toBe(1);
		});

		it("trig is 1 on note onset", () => {
			const { process, config } = getProcessAndConfig("c4");
			const state: Record<string, unknown> = {};

			process({ clk: [-120] }, config, state, SAMPLE_RATE);
			let out = process({ clk: [1] }, config, state, SAMPLE_RATE);
			expect(out.trig[0]).toBe(1);

			// Next sample, no trig
			out = process({ clk: [1] }, config, state, SAMPLE_RATE);
			expect(out.trig[0]).toBe(0);
		});
	});

	describe("multi-voice (stack)", () => {
		it("outputs array per voice for chord", () => {
			const { process, config } = getProcessAndConfig("{c4,e4,g4}");
			const state: Record<string, unknown> = {};

			process({ clk: [-120] }, config, state, SAMPLE_RATE);
			const out = process({ clk: [1] }, config, state, SAMPLE_RATE);

			expect(out.cv).toHaveLength(3);
			expect(out.gate).toHaveLength(3);
			expect(out.trig).toHaveLength(3);

			// All voices should have gate = 1
			expect(out.gate[0]).toBe(1);
			expect(out.gate[1]).toBe(1);
			expect(out.gate[2]).toBe(1);
		});

		it("nested stack flattens voices", () => {
			const { process, config } = getProcessAndConfig("{c4, {a4, b4}, g4}");
			const state: Record<string, unknown> = {};

			process({ clk: [-120] }, config, state, SAMPLE_RATE);
			const out = process({ clk: [1] }, config, state, SAMPLE_RATE);

			expect(out.cv).toHaveLength(4);
		});
	});

	describe("beat advancement", () => {
		it("advances on trigger rising edge", () => {
			const { process, config } = getProcessAndConfig("c4 e4");
			const state: Record<string, unknown> = {};

			// Reset
			process({ clk: [-120] }, config, state, SAMPLE_RATE);

			// First beat
			let out = process({ clk: [1] }, config, state, SAMPLE_RATE);
			const firstCv = out.cv[0];

			// Still first beat
			out = process({ clk: [0] }, config, state, SAMPLE_RATE);
			expect(out.cv[0]).toBe(firstCv);

			// Advance to second beat
			out = process({ clk: [1] }, config, state, SAMPLE_RATE);
			expect(out.cv[0]).not.toBe(firstCv);
		});
	});

	describe("rest handling", () => {
		it("rest produces gate = 0", () => {
			const { process, config } = getProcessAndConfig("~");
			const state: Record<string, unknown> = {};

			process({ clk: [-120] }, config, state, SAMPLE_RATE);
			const out = process({ clk: [1] }, config, state, SAMPLE_RATE);

			expect(out.gate[0]).toBe(0);
		});
	});

	describe("polyrhythm", () => {
		it("handles 3:2 polyrhythm", () => {
			const { process, config } = getProcessAndConfig("{c4 d4 e4, f4 g4}");
			const state: Record<string, unknown> = {};

			process({ clk: [-120] }, config, state, SAMPLE_RATE);
			const out = process({ clk: [1] }, config, state, SAMPLE_RATE);

			// Should have 2 voices
			expect(out.cv).toHaveLength(2);
		});
	});
});
