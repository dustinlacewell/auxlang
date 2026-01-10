import { beforeEach, describe, expect, it } from "vitest";
import { device } from "./device";
import { resetIdCounter } from "./identity";
import { inputs } from "./inputs";
import { isDescriptor } from "./is-descriptor";
import { isOutputRef } from "./is-output-ref";
import { isPoly, poly } from "./poly";
import { clearDeviceRegistry } from "./registry";

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

describe("device with name (Uzu chaining)", () => {
	beforeEach(() => {
		resetIdCounter();
		clearDeviceRegistry();
	});

	it("registers device by name", () => {
		// Create a named device - this registers it
		device("osc", {
			inputs: inputs({ freq: 440 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		// Create another device that will chain to osc
		const seq = device("seq", {
			inputs: inputs({ clk: 0 }),
			outputs: ["cv"] as const,
			defaultInput: "clk" as const,
			defaultOutput: "cv" as const,
			process: () => ({ cv: 0 }),
		});

		// Chain: seq().osc() should work
		const seqInstance = seq(1);
		const chained = (seqInstance as any).osc();

		expect(isDescriptor(chained)).toBe(true);
		// The chained descriptor should have seq's output as its input
		expect(chained._state.inputBindings.freq.descriptorId).toBe(seqInstance._state.id);
		expect(chained._state.inputBindings.freq.outputName).toBe("cv");
	});

	it("chained device has correct spec", () => {
		const osc = device("osc", {
			inputs: inputs({ freq: 440, detune: 0 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		const seq = device("seq", {
			inputs: inputs({ clk: 0 }),
			outputs: ["cv"] as const,
			defaultInput: "clk" as const,
			defaultOutput: "cv" as const,
			process: () => ({ cv: 0 }),
		});

		const seqInstance = seq(1);
		const chained = (seqInstance as any).osc();

		// Should have osc's spec
		expect(chained._state.spec.inputs.freq).toBeDefined();
		expect(chained._state.spec.inputs.detune).toBeDefined();
		expect(chained._state.spec.outputs).toContain("out");
	});

	it("chained device can further chain params", () => {
		device("osc", {
			inputs: inputs({ freq: 440, detune: 0 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		const seq = device("seq", {
			inputs: inputs({ clk: 0 }),
			outputs: ["cv"] as const,
			defaultInput: "clk" as const,
			defaultOutput: "cv" as const,
			process: () => ({ cv: 0 }),
		});

		const seqInstance = seq(1);
		const chained = (seqInstance as any).osc().detune(5);

		expect(chained._state.inputBindings.detune).toBe(5);
		// freq should still be the seq output
		expect(chained._state.inputBindings.freq.descriptorId).toBe(seqInstance._state.id);
	});

	it("property access returns ChainableOutput, calling throws for unknown device", () => {
		const seq = device("seq", {
			inputs: inputs({ clk: 0 }),
			outputs: ["cv"] as const,
			defaultInput: "clk" as const,
			defaultOutput: "cv" as const,
			process: () => ({ cv: 0 }),
		});

		const seqInstance = seq(1);

		// Property access returns a ChainableOutput (for potential output reference)
		const unknownRef = (seqInstance as any).unknownDevice;
		expect(isOutputRef(unknownRef)).toBe(true);

		// But calling it throws because "unknownDevice" is not a registered device
		expect(() => unknownRef()).toThrow(/unknownDevice.*not.*registered/i);
	});
});

describe("poly descriptor Uzu chaining", () => {
	beforeEach(() => {
		resetIdCounter();
		clearDeviceRegistry();
	});

	it("chains device to each voice in poly", () => {
		// Register osc device
		device("osc", {
			inputs: inputs({ freq: 440 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		// Create two seq devices and wrap in poly
		const seq = device("seq", {
			inputs: inputs({ clk: 0 }),
			outputs: ["cv"] as const,
			defaultInput: "clk" as const,
			defaultOutput: "cv" as const,
			process: () => ({ cv: 0 }),
		});

		const voice0 = seq(1);
		const voice1 = seq(2);
		const polySeq = poly([voice0, voice1]);

		// Chain: polySeq.osc() should return poly with 2 oscs
		const chained = (polySeq as any).osc();

		expect(isPoly(chained)).toBe(true);
		expect(chained.voices.length).toBe(2);

		// Each voice should be an osc with the corresponding seq output as input
		expect(isDescriptor(chained.voices[0])).toBe(true);
		expect(chained.voices[0]._state.inputBindings.freq.descriptorId).toBe(voice0._state.id);
		expect(chained.voices[1]._state.inputBindings.freq.descriptorId).toBe(voice1._state.id);
	});

	it("multiple chains propagate through poly", () => {
		device("osc", {
			inputs: inputs({ freq: 440 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		device("lpf", {
			inputs: inputs({ input: 0, cutoff: 1000 }),
			outputs: ["out"] as const,
			defaultInput: "input" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		const seq = device("seq", {
			inputs: inputs({ clk: 0 }),
			outputs: ["cv"] as const,
			defaultInput: "clk" as const,
			defaultOutput: "cv" as const,
			process: () => ({ cv: 0 }),
		});

		const voice0 = seq(1);
		const voice1 = seq(2);
		const polySeq = poly([voice0, voice1]);

		// Chain: polySeq.osc().lpf() should return poly with 2 lpfs
		const chained = (polySeq as any).osc().lpf();

		expect(isPoly(chained)).toBe(true);
		expect(chained.voices.length).toBe(2);

		// Each voice should be an lpf (check spec)
		expect(chained.voices[0]._state.spec.inputs.cutoff).toBeDefined();
		expect(chained.voices[1]._state.spec.inputs.cutoff).toBeDefined();
	});
});
