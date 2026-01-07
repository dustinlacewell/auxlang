import { describe, expect, it } from "vitest";
import { isDescriptor } from "../../descriptor/is-descriptor";
import { seq } from "./seq";

describe("seq", () => {
	it("creates a valid descriptor", () => {
		const s = seq("c4 e4 g4");
		expect(isDescriptor(s)).toBe(true);
	});

	it("has cv and gate outputs", () => {
		const s = seq("c4 e4 g4");
		expect(s._state.spec.outputs).toContain("cv");
		expect(s._state.spec.outputs).toContain("gate");
	});

	it("has trig and gateIn inputs", () => {
		const s = seq("c4 e4 g4");
		expect(s._state.spec.inputs).toHaveProperty("trig");
		expect(s._state.spec.inputs).toHaveProperty("gateIn");
	});

	it("stores pattern in config", () => {
		const s = seq("c4 e4 g4");
		expect(s._state.spec.config).toHaveProperty("pattern");
	});

	it("has default input of trig", () => {
		const s = seq("c4 e4 g4");
		expect(s._state.spec.defaultInput).toBe("trig");
	});

	it("has default output of cv", () => {
		const s = seq("c4 e4 g4");
		expect(s._state.spec.defaultOutput).toBe("cv");
	});

	it("can set trig input via chaining", () => {
		const s = seq("c4 e4 g4").trig(1);
		expect(s._state.inputBindings).toHaveProperty("trig", 1);
	});

	it("can set gateIn input via chaining", () => {
		const s = seq("c4 e4 g4").gateIn(1);
		expect(s._state.inputBindings).toHaveProperty("gateIn", 1);
	});

	it("supports calling with default input", () => {
		const s = seq("c4 e4 g4")(0.5);
		expect(s._state.inputBindings).toHaveProperty("trig", 0.5);
	});

	describe("process function", () => {
		function getProcessAndConfig(patternString: string) {
			const s = seq(patternString);
			const process = s._state.spec.process;
			const patternDef = s._state.spec.config.pattern;
			if (!patternDef) throw new Error("Expected pattern config");
			const config = { pattern: patternDef.default };
			return { process, config };
		}

		it("outputs initial cv from first note", () => {
			const { process, config } = getProcessAndConfig("c4 e4 g4");
			const state: Record<string, unknown> = {};

			const result = process(
				{ trig: 0, gateIn: 0 },
				config,
				state,
				44100,
			);

			expect(result.cv).toBeCloseTo(261.63, 1); // C4
		});

		it("outputs gate=0 when input gateIn is low", () => {
			const { process, config } = getProcessAndConfig("c4 e4 g4");
			const state: Record<string, unknown> = {};

			const result = process(
				{ trig: 0, gateIn: 0 },
				config,
				state,
				44100,
			);

			expect(result.gate).toBe(0);
		});

		it("outputs gate=1 when input gateIn is high and step is note", () => {
			const { process, config } = getProcessAndConfig("c4 e4 g4");
			const state: Record<string, unknown> = {};

			const result = process(
				{ trig: 0, gateIn: 1 },
				config,
				state,
				44100,
			);

			expect(result.gate).toBe(1);
		});

		it("advances step on trigger rising edge", () => {
			const { process, config } = getProcessAndConfig("c4 e4 g4");
			const state: Record<string, unknown> = {};

			// First call - step 0
			process({ trig: 0, gateIn: 1 }, config, state, 44100);
			const cv0 = state.cv as number;

			// Trigger low -> high (rising edge) - advances to step 1
			process({ trig: 1, gateIn: 1 }, config, state, 44100);
			const cv1 = state.cv as number;

			expect(cv0).toBeCloseTo(261.63, 1); // C4
			expect(cv1).toBeCloseTo(329.63, 1); // E4
		});

		it("does not advance on sustained trigger", () => {
			const { process, config } = getProcessAndConfig("c4 e4 g4");
			const state: Record<string, unknown> = {};

			// First rising edge - advances to step 1
			process({ trig: 0, gateIn: 1 }, config, state, 44100);
			process({ trig: 1, gateIn: 1 }, config, state, 44100);
			const cv1 = state.cv as number;

			// Sustained high - should NOT advance
			process({ trig: 1, gateIn: 1 }, config, state, 44100);
			const cv2 = state.cv as number;

			expect(cv1).toBe(cv2);
		});

		it("wraps around at end of pattern", () => {
			const { process, config } = getProcessAndConfig("c4 e4");
			const state: Record<string, unknown> = {};

			// Step 0
			process({ trig: 0, gateIn: 1 }, config, state, 44100);

			// Rising edge -> step 1
			process({ trig: 1, gateIn: 1 }, config, state, 44100);
			process({ trig: 0, gateIn: 1 }, config, state, 44100);

			// Rising edge -> step 0 (wrap)
			process({ trig: 1, gateIn: 1 }, config, state, 44100);
			const cv = state.cv as number;

			expect(cv).toBeCloseTo(261.63, 1); // C4
		});

		it("suppresses gate on rest steps", () => {
			const { process, config } = getProcessAndConfig("c4 ~");
			const state: Record<string, unknown> = {};

			// Step 0 (note) - gate should follow input
			let result = process({ trig: 0, gateIn: 1 }, config, state, 44100);
			expect(result.gate).toBe(1);

			// Advance to step 1 (rest)
			process({ trig: 1, gateIn: 1 }, config, state, 44100);
			result = process({ trig: 0, gateIn: 1 }, config, state, 44100);

			// Gate should be 0 even though input gateIn is high
			expect(result.gate).toBe(0);
		});

		it("holds cv on rest steps", () => {
			const { process, config } = getProcessAndConfig("c4 ~");
			const state: Record<string, unknown> = {};

			// Step 0 (C4)
			process({ trig: 0, gateIn: 1 }, config, state, 44100);
			const cv0 = state.cv as number;

			// Advance to step 1 (rest) - cv should hold
			process({ trig: 1, gateIn: 1 }, config, state, 44100);
			const cv1 = state.cv as number;

			expect(cv0).toBeCloseTo(261.63, 1);
			expect(cv1).toBeCloseTo(261.63, 1); // Still C4
		});

		it("handles empty pattern gracefully", () => {
			const { process, config } = getProcessAndConfig("");
			const state: Record<string, unknown> = {};

			const result = process({ trig: 1, gateIn: 1 }, config, state, 44100);

			expect(result.cv).toBe(0);
			expect(result.gate).toBe(0);
		});
	});
});
