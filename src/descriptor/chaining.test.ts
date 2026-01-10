import { beforeEach, describe, expect, it } from "vitest";
import { resetIdCounter } from "./identity";
import { isDescriptor } from "./is-descriptor";
import { isOutputRef } from "./is-output-ref";
import { clearDeviceRegistry } from "./registry";

import { lpf } from "../devices/lpf";
import { osc, sin, sqr, tri } from "../devices/osc";
// Import real devices - this triggers their registration
import { saw } from "../devices/saw";

// Force side effects - ensure devices are registered
void saw;
void lpf;
void osc;
void sin;
void tri;
void sqr;

describe("real device chaining", () => {
	beforeEach(() => {
		resetIdCounter();
		// Note: don't clear device registry here - we want the real devices registered
	});

	it("saw is registered and chainable", () => {
		// Create a dummy source device
		const source = osc(440);

		// Chain saw - should look up 'saw' in registry
		const chained = (source as any).saw();

		expect(isDescriptor(chained)).toBe(true);
		expect(chained._state.spec.inputs.freq).toBeDefined();
		// The input should be wired to osc's output
		expect(chained._state.inputBindings.freq.descriptorId).toBe(source._state.id);
		expect(chained._state.inputBindings.freq.outputName).toBe("audio");
	});

	it("lpf is registered and chainable", () => {
		const source = saw(440);

		const chained = (source as any).lpf();

		expect(isDescriptor(chained)).toBe(true);
		expect(chained._state.spec.inputs.cutoff).toBeDefined();
		expect(chained._state.inputBindings.input.descriptorId).toBe(source._state.id);
	});

	it("multi-step chaining works: osc -> saw -> lpf", () => {
		const chain = (osc(440) as any).saw().lpf();

		expect(isDescriptor(chain)).toBe(true);
		// Should be an lpf at the end
		expect(chain._state.spec.inputs.cutoff).toBeDefined();
	});

	it("chaining preserves ability to set params", () => {
		const chain = (osc(440) as any).lpf().cutoff(800).resonance(0.5);

		expect(chain._state.inputBindings.cutoff).toBe(800);
		expect(chain._state.inputBindings.resonance).toBe(0.5);
	});

	it("all oscillator variants are registered", () => {
		const source = osc(440);

		// Each should be chainable
		expect(typeof (source as any).sin).toBe("function");
		expect(typeof (source as any).tri).toBe("function");
		expect(typeof (source as any).sqr).toBe("function");
		expect(typeof (source as any).sawOsc).toBe("function");
	});
});

describe("output access and chaining semantics", () => {
	beforeEach(() => {
		resetIdCounter();
	});

	it("s.audio returns an OutputRef-like object", () => {
		const source = osc(440);

		// Access a valid output
		const ref = source.audio;

		expect(isOutputRef(ref)).toBe(true);
		expect(ref.descriptorId).toBe(source._state.id);
		expect(ref.outputName).toBe("audio");
	});

	it("s.bogus returns an OutputRef-like object (validation deferred to reify)", () => {
		const source = osc(440);

		// Access an invalid output - API doesn't validate, just records
		const ref = (source as any).bogus;

		expect(isOutputRef(ref)).toBe(true);
		expect(ref.descriptorId).toBe(source._state.id);
		expect(ref.outputName).toBe("bogus");
	});

	it("s.saw() chains the saw device using default output", () => {
		const source = osc(440);

		const chained = (source as any).saw();

		expect(isDescriptor(chained)).toBe(true);
		// Input should be wired to source's default output
		expect(chained._state.inputBindings.freq.descriptorId).toBe(source._state.id);
		expect(chained._state.inputBindings.freq.outputName).toBe("audio");
	});

	it("s.audio.saw() chains the saw device using explicit output", () => {
		const source = osc(440);

		const chained = (source as any).audio.saw();

		expect(isDescriptor(chained)).toBe(true);
		expect(chained._state.inputBindings.freq.descriptorId).toBe(source._state.id);
		expect(chained._state.inputBindings.freq.outputName).toBe("audio");
	});

	it("s.audio() throws because 'audio' is not a registered device", () => {
		const source = osc(440);

		// Calling an output name as if it were a device should fail
		expect(() => (source as any).audio()).toThrow(/audio.*not.*device|not a function/i);
	});

	it("s.notADevice() throws because device not found", () => {
		const source = osc(440);

		// Calling a non-existent device should fail
		expect(() => (source as any).notADevice()).toThrow();
	});

	it("ChainableOutput is callable and a function", () => {
		const source = osc(440);
		const ref = source.audio;

		// It's a function (callable)
		expect(typeof ref).toBe("function");
		// But isOutputRef should recognize it
		expect(isOutputRef(ref)).toBe(true);
		// And isDescriptor should NOT recognize it (no _state)
		expect(isDescriptor(ref)).toBe(false);
		// And it has the OutputRef properties
		expect(ref.descriptorId).toBe(source._state.id);
		expect(ref.outputName).toBe("audio");
	});
});
