/**
 * Chaining Tests
 * Tests: direct chaining, explicit output chaining, params, unknown device, immutability
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as api from "../../editor/api";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";
import { isOutputRef } from "../../descriptor/guards/is-output-ref";
import { resetIdCounter } from "../../descriptor/identity";
import { clearRegistry } from "../../descriptor/registry";

const { saw, lpf, seq, clock, osc, adsr, gain, lfo, device } = api;

describe("Chaining", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	describe("direct Uzu chaining", () => {
		it("osc(440).saw() chains default output", () => {
			const s = osc(440).saw();
			expect(isDescriptor(s)).toBe(true);
			expect(isOutputRef(s._state.inputBindings.freq)).toBe(true);
		});

		it("saw(440).lpf().gain() multi-step chain", () => {
			const g = saw(440).lpf().gain();
			expect(isDescriptor(g)).toBe(true);
		});
	});

	describe("chaining from explicit output", () => {
		it("seq.cv.saw() chains from cv output", () => {
			const s = clock(120).seq("c4");
			if (isDescriptor(s)) {
				const sawInst = s.cv.saw();
				expect(isDescriptor(sawInst)).toBe(true);
			}
		});

		it("seq.gate.adsr() chains from gate output", () => {
			const s = clock(120).seq("c4");
			if (isDescriptor(s)) {
				const env = s.gate.adsr();
				expect(isDescriptor(env)).toBe(true);
			}
		});
	});

	describe("chaining with parameters", () => {
		it("saw(440).lpf({ cutoff: 800 }) device + params", () => {
			const f = saw(440).lpf({ cutoff: 800 });
			expect(f._state.inputBindings.cutoff).toBe(800);
		});

		it("seq.cv.saw({ freq: 880 }) throws - cannot override chained input", () => {
			const s = seq("c4").clk(clock(120));
			if (isDescriptor(s)) {
				// Providing the default input in params when chaining should error
				expect(() => (s as any).cv.saw({ freq: 880 })).toThrow();
			}
		});

		it("saw(440).lpf({ resonance: 0.8 }) works - non-default params allowed", () => {
			// lpf's default input is 'input', so resonance is fine to set when chaining
			const f = saw(440).lpf({ resonance: 0.8 });
			expect(f._state.inputBindings.resonance).toBe(0.8);
		});
	});

	describe("chaining to unknown device", () => {
		it("saw().unknownDevice() throws", () => {
			const s = saw(440);
			expect(() =>
				(s as unknown as Record<string, () => unknown>).unknownDevice(),
			).toThrow();
		});
	});

	describe("immutability", () => {
		it("setters return new descriptor, original unchanged", () => {
			const s = saw(440);
			const s2 = s.freq(880);
			expect(s._state.id).not.toBe(s2._state.id);
			expect(s._state.inputBindings.freq).toBe(440);
			expect(s2._state.inputBindings.freq).toBe(880);
		});
	});

	describe("chaining vs positional disambiguation", () => {
		it("gain(lfo()) - LFO goes to level (first positional), not input", () => {
			const l = lfo(0.5);
			const g = gain(l);
			// gain's positionalArgs is ["level", "input"], so lfo goes to level
			expect(isOutputRef(g._state.inputBindings.level)).toBe(true);
			// input should be unbound (uses default)
			expect(g._state.inputBindings.input).toBeUndefined();
		});

		it("saw().gain() - saw goes to input (defaultInput via chain)", () => {
			const g = (saw(440) as any).gain();
			// Chain source goes to defaultInput which is "input"
			expect(isOutputRef(g._state.inputBindings.input)).toBe(true);
			// level should be unbound
			expect(g._state.inputBindings.level).toBeUndefined();
		});

		it("saw().gain(0.5) - saw to input, 0.5 to level", () => {
			const g = (saw(440) as any).gain(0.5);
			// Chain source to input
			expect(isOutputRef(g._state.inputBindings.input)).toBe(true);
			// Positional 0.5 to level
			expect(g._state.inputBindings.level).toBe(0.5);
		});

		it("saw().gain(lfo()) - saw to input, lfo to level", () => {
			const g = (saw(440) as any).gain(lfo(2));
			// Chain source to input
			expect(isOutputRef(g._state.inputBindings.input)).toBe(true);
			// LFO to level (first positional after chain)
			expect(isOutputRef(g._state.inputBindings.level)).toBe(true);
		});
	});

	describe("device alias chaining", () => {
		it("device alias preserves template bindings when chained", () => {
			// Create alias with LFO on level
			const shh = device("shh", gain(lfo(0.5)));
			expect(isDescriptor(shh)).toBe(true);

			// Chain saw to alias - LFO should stay on level, saw goes to input
			const result = (saw(440) as any).shh();
			expect(isDescriptor(result)).toBe(true);
			// level should have the LFO reference from template
			expect(isOutputRef(result._state.inputBindings.level)).toBe(true);
			// input should have the saw reference from chain
			expect(isOutputRef(result._state.inputBindings.input)).toBe(true);
		});

		it("device alias allows override via positional when chained", () => {
			device("shh2", gain(lfo(0.5)));
			// Chain + override level
			const result = (saw(440) as any).shh2(0.8);
			// level overridden to 0.8
			expect(result._state.inputBindings.level).toBe(0.8);
			// input from chain
			expect(isOutputRef(result._state.inputBindings.input)).toBe(true);
		});
	});
});
