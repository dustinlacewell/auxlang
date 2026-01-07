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

	it("has trig input", () => {
		const s = seq("c4 e4 g4");
		expect(s._state.spec.inputs).toHaveProperty("trig");
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

		// Helper to simulate clock reset signal (which also starts beat 0)
		// bpm defaults to 120, which gives samplesPerBeat = 22050 at 44100 Hz
		function simulateReset(
			process: ReturnType<typeof getProcessAndConfig>["process"],
			config: ReturnType<typeof getProcessAndConfig>["config"],
			state: Record<string, unknown>,
			sampleRate: number,
			bpm = 120
		) {
			// Send reset signal with BPM (-bpm) - this IS beat 0
			return process({ trig: -bpm }, config, state, sampleRate);
		}

		// Helper to advance to next beat (wait samplesPerBeat, then trigger)
		function advanceBeat(
			process: ReturnType<typeof getProcessAndConfig>["process"],
			config: ReturnType<typeof getProcessAndConfig>["config"],
			state: Record<string, unknown>,
			sampleRate: number,
			samplesPerBeat: number
		) {
			// Wait for beat duration
			for (let i = 0; i < samplesPerBeat; i++) {
				process({ trig: 0 }, config, state, sampleRate);
			}
			// Send trigger to advance
			return process({ trig: 1 }, config, state, sampleRate);
		}

		it("outputs cv from first note on reset", () => {
			const { process, config } = getProcessAndConfig("c4 e4 g4");
			const state: Record<string, unknown> = {};
			const sampleRate = 44100;

			// Reset signal IS beat 0
			const result = simulateReset(process, config, state, sampleRate);

			expect(result.cv).toBeCloseTo(261.63, 1); // C4
		});

		it("generates gate=1 at start of note", () => {
			const { process, config } = getProcessAndConfig("c4 e4 g4");
			const state: Record<string, unknown> = {};
			const sampleRate = 44100;

			// Reset signal IS beat 0
			const result = simulateReset(process, config, state, sampleRate);

			expect(result.gate).toBe(1);
		});

		it("advances step on trigger rising edge", () => {
			const { process, config } = getProcessAndConfig("c4 e4 g4");
			const state: Record<string, unknown> = {};
			const sampleRate = 44100;
			const samplesPerBeat = 22050;

			// Reset -> beat 0 (C4)
			simulateReset(process, config, state, sampleRate);
			const cv0 = state.cv as number;

			// Wait and trigger -> beat 1 (E4)
			advanceBeat(process, config, state, sampleRate, samplesPerBeat);
			const cv1 = state.cv as number;

			expect(cv0).toBeCloseTo(261.63, 1); // C4
			expect(cv1).toBeCloseTo(329.63, 1); // E4
		});

		it("does not advance on sustained trigger", () => {
			const { process, config } = getProcessAndConfig("c4 e4 g4");
			const state: Record<string, unknown> = {};
			const sampleRate = 44100;
			const samplesPerBeat = 22050;

			// Reset -> beat 0
			simulateReset(process, config, state, sampleRate);

			// Wait and trigger -> beat 1
			advanceBeat(process, config, state, sampleRate, samplesPerBeat);
			const cv1 = state.cv as number;

			// Sustained high - should NOT advance
			process({ trig: 1 }, config, state, sampleRate);
			const cv2 = state.cv as number;

			expect(cv1).toBe(cv2);
		});

		it("wraps around at end of pattern", () => {
			const { process, config } = getProcessAndConfig("c4 e4");
			const state: Record<string, unknown> = {};
			const sampleRate = 44100;
			const samplesPerBeat = 22050;

			// Reset -> beat 0
			simulateReset(process, config, state, sampleRate);

			// Trigger -> beat 1
			advanceBeat(process, config, state, sampleRate, samplesPerBeat);

			// Trigger -> beat 0 (wrap)
			advanceBeat(process, config, state, sampleRate, samplesPerBeat);
			const cv = state.cv as number;

			expect(cv).toBeCloseTo(261.63, 1); // C4
		});

		it("suppresses gate on rest steps", () => {
			const { process, config } = getProcessAndConfig("c4 ~");
			const state: Record<string, unknown> = {};
			const sampleRate = 44100;
			const samplesPerBeat = 22050;

			// Beat 0 (note) - gate should be 1
			let result = simulateReset(process, config, state, sampleRate);
			expect(result.gate).toBe(1);

			// Advance to beat 1 (rest)
			result = advanceBeat(process, config, state, sampleRate, samplesPerBeat);

			// Gate should be 0 on rest
			expect(result.gate).toBe(0);
		});

		it("holds cv on rest steps", () => {
			const { process, config } = getProcessAndConfig("c4 ~");
			const state: Record<string, unknown> = {};
			const sampleRate = 44100;
			const samplesPerBeat = 22050;

			// Beat 0 (C4)
			simulateReset(process, config, state, sampleRate);
			const cv0 = state.cv as number;

			// Advance to beat 1 (rest) - cv should hold
			advanceBeat(process, config, state, sampleRate, samplesPerBeat);
			const cv1 = state.cv as number;

			expect(cv0).toBeCloseTo(261.63, 1);
			expect(cv1).toBeCloseTo(261.63, 1); // Still C4
		});

		it("handles empty pattern gracefully", () => {
			const { process, config } = getProcessAndConfig("");
			const state: Record<string, unknown> = {};

			const result = process({ trig: 1 }, config, state, 44100);

			expect(result.cv).toBe(0);
			expect(result.gate).toBe(0);
		});

		it("outputs nothing before reset/trigger", () => {
			const { process, config } = getProcessAndConfig("c4 e4 g4");
			const state: Record<string, unknown> = {};

			// No reset or trigger yet
			const result = process({ trig: 0 }, config, state, 44100);

			expect(result.cv).toBe(0);
			expect(result.gate).toBe(0);
		});

		it("generates gate with 80% duty cycle", () => {
			const { process, config } = getProcessAndConfig("c4");
			const state: Record<string, unknown> = {};
			const sampleRate = 44100;
			const samplesPerBeat = 1000; // Short for testing
			const bpm = (60 * sampleRate) / samplesPerBeat; // Calculate BPM from samplesPerBeat

			// Reset (beat 0)
			simulateReset(process, config, state, sampleRate, bpm);

			// At start of beat, gate should be high
			const resultStart = process({ trig: 0 }, config, state, sampleRate);
			expect(resultStart.gate).toBe(1);

			// Advance to 85% of beat - gate should be low
			for (let i = 0; i < samplesPerBeat * 0.84; i++) {
				process({ trig: 0 }, config, state, sampleRate);
			}
			const resultEnd = process({ trig: 0 }, config, state, sampleRate);
			expect(resultEnd.gate).toBe(0);
		});

		it("holds gate high for tied notes", () => {
			const { process, config } = getProcessAndConfig("c4@2");
			const state: Record<string, unknown> = {};
			const sampleRate = 44100;
			const samplesPerBeat = 22050;

			// Beat 0 - first beat of tied note
			const result0 = simulateReset(process, config, state, sampleRate);
			expect(result0.gate).toBe(1);

			// Advance to beat 1 (second beat of tie)
			const result1 = advanceBeat(process, config, state, sampleRate, samplesPerBeat);

			// Gate should still be high for tied continuation
			expect(result1.gate).toBe(1);
		});

		it("knows tempo immediately from reset signal", () => {
			const { process, config } = getProcessAndConfig("c4*4");
			const state: Record<string, unknown> = {};
			const sampleRate = 44100;
			const bpm = 120;
			const expectedSamplesPerBeat = (60 / bpm) * sampleRate; // 22050

			// Reset with BPM - tempo should be known immediately
			simulateReset(process, config, state, sampleRate, bpm);

			// Tempo should be calculated from BPM
			expect(state.samplesPerBeat).toBe(expectedSamplesPerBeat);
		});
	});
});
