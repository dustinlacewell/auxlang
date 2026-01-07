import { beforeEach, describe, expect, it } from "vitest";
import { device } from "./device";
import { resetIdCounter } from "./identity";
import { inputs } from "./inputs";
import { isDescriptor } from "./is-descriptor";
import { isOutputRef } from "./is-output-ref";

const testSpec = {
	inputs: inputs({ pitch: 440, detune: 0 }),
	outputs: ["out"] as const,
	defaultInput: "pitch" as const,
	defaultOutput: "out" as const,
	process: () => ({ out: 0 }),
};

describe("device", () => {
	beforeEach(() => {
		resetIdCounter();
	});

	it("creates a descriptor", () => {
		const saw = device(testSpec);
		expect(isDescriptor(saw)).toBe(true);
	});

	it("calling descriptor sets default input and returns NEW descriptor", () => {
		const saw = device(testSpec);
		const saw440 = saw(440);

		expect(isDescriptor(saw440)).toBe(true);
		expect(saw440._state.id).not.toBe(saw._state.id);
		expect(saw440._state.inputBindings.pitch).toBe(440);
	});

	it("chaining returns NEW descriptor with new identity", () => {
		const saw = device(testSpec);
		const saw1 = saw.pitch(440);
		const saw2 = saw.pitch(440);

		// Each chain creates a new descriptor
		expect(saw1._state.id).not.toBe(saw._state.id);
		expect(saw2._state.id).not.toBe(saw._state.id);
		expect(saw1._state.id).not.toBe(saw2._state.id);
	});

	it("preserves bindings through chaining", () => {
		const saw = device(testSpec);
		const sawPitch = saw.pitch(440);
		const sawBoth = sawPitch.detune(5);

		expect(sawBoth._state.inputBindings.pitch).toBe(440);
		expect(sawBoth._state.inputBindings.detune).toBe(5);
	});

	it("accessing output returns OutputRef", () => {
		const saw = device(testSpec);
		const outRef = saw.out;

		expect(isOutputRef(outRef)).toBe(true);
		if (isOutputRef(outRef)) {
			expect(outRef.descriptorId).toBe(saw._state.id);
			expect(outRef.outputName).toBe("out");
		}
	});
});

const specWithConfig = {
	inputs: inputs({ pitch: 440 }),
	config: {
		waveform: (phase: number) => Math.sin(phase * Math.PI * 2),
	},
	outputs: ["out"] as const,
	defaultInput: "pitch" as const,
	defaultOutput: "out" as const,
	process: () => ({ out: 0 }),
};

describe("device with config", () => {
	beforeEach(() => {
		resetIdCounter();
	});

	it("creates a descriptor with config", () => {
		const osc = device(specWithConfig);
		expect(isDescriptor(osc)).toBe(true);
		expect(osc._state.spec.config.waveform).toBeDefined();
	});

	it("config setter returns NEW descriptor", () => {
		const osc = device(specWithConfig);
		const customWave = (phase: number) => (phase < 0.5 ? 1 : -1);
		const oscSquare = osc.waveform(customWave);

		expect(isDescriptor(oscSquare)).toBe(true);
		expect(oscSquare._state.id).not.toBe(osc._state.id);
		expect(oscSquare._state.configBindings.waveform).toBe(customWave);
	});

	it("preserves config through input chaining", () => {
		const osc = device(specWithConfig);
		const customWave = (phase: number) => (phase < 0.5 ? 1 : -1);
		const oscSquare = osc.waveform(customWave);
		const oscSquare880 = oscSquare.pitch(880);

		expect(oscSquare880._state.configBindings.waveform).toBe(customWave);
		expect(oscSquare880._state.inputBindings.pitch).toBe(880);
	});

	it("preserves inputs through config chaining", () => {
		const osc = device(specWithConfig);
		const osc880 = osc.pitch(880);
		const customWave = (phase: number) => (phase < 0.5 ? 1 : -1);
		const osc880Square = osc880.waveform(customWave);

		expect(osc880Square._state.inputBindings.pitch).toBe(880);
		expect(osc880Square._state.configBindings.waveform).toBe(customWave);
	});
});
