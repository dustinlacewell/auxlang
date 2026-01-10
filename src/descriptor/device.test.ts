import { beforeEach, describe, expect, it } from "vitest";
import { device } from "./device";
import { resetIdCounter } from "./identity";
import { inputs } from "./inputs";
import { isDescriptor } from "./is-descriptor";
import { isOutputRef } from "./is-output-ref";
import { isPoly, poly, type PolyDescriptor } from "./poly";
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

describe("array to poly expansion", () => {
	beforeEach(() => {
		resetIdCounter();
		clearDeviceRegistry();
	});

	it("array input creates poly", () => {
		const saw = device("saw", {
			inputs: inputs({ freq: 440 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		// saw([220, 330, 440]) should create poly with 3 voices
		const polyResult = saw([220, 330, 440]);

		expect(isPoly(polyResult)).toBe(true);
		if (isPoly(polyResult)) {
			expect(polyResult.voices.length).toBe(3);
			expect(polyResult.voices[0]._state.inputBindings.freq).toBe(220);
			expect(polyResult.voices[1]._state.inputBindings.freq).toBe(330);
			expect(polyResult.voices[2]._state.inputBindings.freq).toBe(440);
		}
	});

	it("array via input setter creates poly", () => {
		const saw = device("saw", {
			inputs: inputs({ freq: 440 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		// saw.freq([220, 330, 440]) should create poly with 3 voices
		const polyResult = saw.freq([220, 330, 440]);

		expect(isPoly(polyResult)).toBe(true);
		if (isPoly(polyResult)) {
			expect(polyResult.voices.length).toBe(3);
			expect(polyResult.voices[0]._state.inputBindings.freq).toBe(220);
			expect(polyResult.voices[1]._state.inputBindings.freq).toBe(330);
			expect(polyResult.voices[2]._state.inputBindings.freq).toBe(440);
		}
	});

	it("single element array creates single-voice poly", () => {
		const saw = device("saw", {
			inputs: inputs({ freq: 440 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		const polyResult = saw([220]);

		expect(isPoly(polyResult)).toBe(true);
		if (isPoly(polyResult)) {
			expect(polyResult.voices.length).toBe(1);
		}
	});
});

describe("array distribution on poly", () => {
	beforeEach(() => {
		resetIdCounter();
		clearDeviceRegistry();
	});

	it("array param distributes to voices", () => {
		const mult = device("mult", {
			inputs: inputs({ input: 0, by: 1 }),
			outputs: ["out"] as const,
			defaultInput: "input" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		// Create a poly with 3 voices
		const voice0 = mult(1);
		const voice1 = mult(2);
		const voice2 = mult(3);
		const polyMult = poly([voice0, voice1, voice2]);

		// .by([10, 20, 30]) should distribute
		const result = (polyMult as any).by([10, 20, 30]);

		expect(isPoly(result)).toBe(true);
		if (isPoly(result)) {
			expect(result.voices[0]._state.inputBindings.by).toBe(10);
			expect(result.voices[1]._state.inputBindings.by).toBe(20);
			expect(result.voices[2]._state.inputBindings.by).toBe(30);
		}
	});

	it("shorter array wraps around", () => {
		const mult = device("mult", {
			inputs: inputs({ input: 0, by: 1 }),
			outputs: ["out"] as const,
			defaultInput: "input" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		// Create a poly with 4 voices
		const polyMult = poly([mult(1), mult(2), mult(3), mult(4)]);

		// .by([10, 20]) should wrap: voice 0=10, voice 1=20, voice 2=10, voice 3=20
		const result = (polyMult as any).by([10, 20]);

		expect(isPoly(result)).toBe(true);
		if (isPoly(result)) {
			expect(result.voices[0]._state.inputBindings.by).toBe(10);
			expect(result.voices[1]._state.inputBindings.by).toBe(20);
			expect(result.voices[2]._state.inputBindings.by).toBe(10);
			expect(result.voices[3]._state.inputBindings.by).toBe(20);
		}
	});

	it("scalar broadcasts to all voices", () => {
		const mult = device("mult", {
			inputs: inputs({ input: 0, by: 1 }),
			outputs: ["out"] as const,
			defaultInput: "input" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		const polyMult = poly([mult(1), mult(2), mult(3)]);

		// .by(0.5) should broadcast to all voices
		const result = (polyMult as any).by(0.5);

		expect(isPoly(result)).toBe(true);
		if (isPoly(result)) {
			expect(result.voices[0]._state.inputBindings.by).toBe(0.5);
			expect(result.voices[1]._state.inputBindings.by).toBe(0.5);
			expect(result.voices[2]._state.inputBindings.by).toBe(0.5);
		}
	});

	it("array distributes via callable (default input)", () => {
		const saw = device("saw", {
			inputs: inputs({ freq: 440 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		// Create poly of 3 saws
		const polySaw = poly([saw(100), saw(200), saw(300)]);

		// Call with array to set default input on each
		const result = (polySaw as any)([1000, 2000, 3000]);

		expect(isPoly(result)).toBe(true);
		if (isPoly(result)) {
			expect(result.voices[0]._state.inputBindings.freq).toBe(1000);
			expect(result.voices[1]._state.inputBindings.freq).toBe(2000);
			expect(result.voices[2]._state.inputBindings.freq).toBe(3000);
		}
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

describe("apply method", () => {
	beforeEach(() => {
		resetIdCounter();
		clearDeviceRegistry();
	});

	it("descriptor.apply passes descriptor to callback", () => {
		const saw = device("saw", {
			inputs: inputs({ freq: 440 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		const result = saw(220);
		let captured: AnyDescriptor | null = null;

		const returned = (result as any).apply((d: AnyDescriptor) => {
			captured = d;
			return "test-return";
		});

		expect(captured).toBe(result);
		expect(returned).toBe("test-return");
	});

	it("apply allows inline variable binding", () => {
		const clock = device("clock", {
			inputs: inputs({ bpm: 120 }),
			outputs: ["out", "gate"] as const,
			defaultInput: "bpm" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0, gate: 0 }),
		});

		const seq = device("seq", {
			inputs: inputs({ clk: 0 }),
			outputs: ["cv"] as const,
			defaultInput: "clk" as const,
			defaultOutput: "cv" as const,
			process: () => ({ cv: 0 }),
		});

		const saw = device("saw", {
			inputs: inputs({ freq: 440 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		// Use apply to capture clock and use it in two places
		const result = (clock(120) as any).apply((c: AnyDescriptor) => {
			const s = seq(c.out);
			return (s as any).saw();
		});

		// Result should be a saw descriptor
		expect(isDescriptor(result)).toBe(true);
		expect(result._state.spec.defaultOutput).toBe("out");
	});

	it("poly.apply passes poly to callback", () => {
		const saw = device("saw", {
			inputs: inputs({ freq: 440 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		const polySaw = poly([saw(220), saw(330), saw(440)]);
		let captured: PolyDescriptor | null = null;

		const returned = (polySaw as any).apply((p: PolyDescriptor) => {
			captured = p;
			return "poly-test";
		});

		expect(isPoly(captured)).toBe(true);
		expect(captured?.voices.length).toBe(3);
		expect(returned).toBe("poly-test");
	});
});

describe("feedback lambda inputs", () => {
	beforeEach(() => {
		resetIdCounter();
		clearDeviceRegistry();
	});

	it("lambda input creates feedback chain", () => {
		const add = device("add", {
			inputs: inputs({ input: 0, to: 0 }),
			outputs: ["signal"] as const,
			defaultInput: "input" as const,
			defaultOutput: "signal" as const,
			process: () => ({ signal: 0 }),
		});

		const delay = device("delay", {
			inputs: inputs({ input: 0, time: 0.1 }),
			outputs: ["out"] as const,
			defaultInput: "input" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		// Create add with feedback: x => x.delay()
		// This should create: add -> delay, where delay's input is a feedback ref to add's output
		const result = add(1).to((x: any) => x.delay());

		// Result should be a descriptor (the add device)
		expect(isDescriptor(result)).toBe(true);
		if (!isDescriptor(result)) return;

		// The "to" input should be bound to a delay descriptor
		const toBinding = result._state.inputBindings.to;
		expect(isDescriptor(toBinding)).toBe(true);
		if (!isDescriptor(toBinding)) return;

		// The delay's input should be a feedback reference to the add's output
		const delayInput = toBinding._state.inputBindings.input;
		expect(delayInput).toBeDefined();
		// The feedback ref has _feedback: true and targetId pointing to add
		expect((delayInput as any)._feedback).toBe(true);
		expect((delayInput as any).targetId).toBe(result._state.id);
	});

	it("feedback proxy chains multiple devices", () => {
		const add = device("add", {
			inputs: inputs({ input: 0, to: 0 }),
			outputs: ["signal"] as const,
			defaultInput: "input" as const,
			defaultOutput: "signal" as const,
			process: () => ({ signal: 0 }),
		});

		const delay = device("delay", {
			inputs: inputs({ input: 0 }),
			outputs: ["out"] as const,
			defaultInput: "input" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		const mult = device("mult", {
			inputs: inputs({ input: 0, by: 1 }),
			outputs: ["out"] as const,
			defaultInput: "input" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		// x => x.delay().mult({ by: 0.8 })
		// Chain: add -> to:mult -> input:delay -> input:feedback(add)
		const result = add(1).to((x: any) => x.delay().mult({ by: 0.8 }));

		expect(isDescriptor(result)).toBe(true);
		if (!isDescriptor(result)) return;

		// The "to" input should be the mult descriptor
		const multDescriptor = result._state.inputBindings.to;
		expect(isDescriptor(multDescriptor)).toBe(true);
		if (!isDescriptor(multDescriptor)) return;

		// mult.by should be 0.8
		expect(multDescriptor._state.inputBindings.by).toBe(0.8);

		// mult's input comes from delay's output via OutputRef
		const multInput = multDescriptor._state.inputBindings.input;
		// This should be an OutputRef to the delay descriptor
		expect(isOutputRef(multInput)).toBe(true);
	});

	it("regular function signals are not treated as feedback", () => {
		const saw = device("saw", {
			inputs: inputs({ freq: 440 }),
			outputs: ["out"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "out" as const,
			process: () => ({ out: 0 }),
		});

		// OutputRef passed as input should NOT be treated as feedback lambda
		const result = saw(440);
		expect(isDescriptor(result)).toBe(true);

		// Calling with another descriptor should chain correctly
		const chained = saw(result);
		expect(isDescriptor(chained)).toBe(true);
		if (!isDescriptor(chained)) return;

		// The input should be a reference to result's output, not feedback
		const freqBinding = chained._state.inputBindings.freq;
		expect(isDescriptor(freqBinding)).toBe(true);
	});
});
