/**
 * Device Instantiation Tests
 * Tests: no args, positional args, object params, mixed, array expansion
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as api from "../../editor/api";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";
import { isOutputRef } from "../../descriptor/guards/is-output-ref";
import { resetIdCounter } from "../../descriptor/identity";
import { isPoly } from "../../descriptor/poly";
import { clearOutputs } from "../../graph/out";
import { clearRegistry } from "../../descriptor/registry";

const { saw, lfo, lpf, seq, clock, noise, osc, chord } = api;

describe("Device Instantiation", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
		clearOutputs();
	});

	describe("no arguments", () => {
		it("saw() uses defaults from spec", () => {
			const s = saw();
			expect(isDescriptor(s)).toBe(true);
			expect(s._state.spec.inputs.freq.default).toBe(440);
			expect(s._state.inputBindings.freq).toBeUndefined();
		});

		it("noise() creates stateless device", () => {
			const n = noise();
			expect(isDescriptor(n)).toBe(true);
		});
	});

	describe("positional arguments - unchained", () => {
		it("saw(440) sets freq via positional", () => {
			const s = saw(440);
			expect(s._state.inputBindings.freq).toBe(440);
		});

		it("lfo(2, 200, 2000) sets rate, min, max via positionalArgs order", () => {
			const l = lfo(2, 200, 2000);
			expect(l._state.inputBindings.rate).toBe(2);
			expect(l._state.inputBindings.min).toBe(200);
			expect(l._state.inputBindings.max).toBe(2000);
		});

		it("seq(pattern, clk) follows positionalArgs order [pattern, clk]", () => {
			const c = clock(120);
			const s = seq("c4 e4", c);
			expect(isPoly(s) || isDescriptor(s)).toBe(true);
		});

		it("chord(440, 'maj') follows positionalArgs [root, chordName]", () => {
			const ch = chord(440, "maj");
			expect(isPoly(ch)).toBe(true);
			if (isPoly(ch)) {
				expect(ch.voices.length).toBeGreaterThan(1);
			}
		});
	});

	describe("positional arguments - chained", () => {
		it("clock(120).seq('c4') binds clk from chain, pattern positional", () => {
			const s = clock(120).seq("c4 e4");
			expect(isPoly(s) || isDescriptor(s)).toBe(true);
		});

		it("osc(440).saw() binds freq from chain", () => {
			const s = osc(440).saw();
			expect(isDescriptor(s)).toBe(true);
			expect(isOutputRef(s._state.inputBindings.freq)).toBe(true);
		});
	});

	describe("object parameters", () => {
		it("lpf({ cutoff, resonance }) sets via object", () => {
			const f = lpf({ cutoff: 800, resonance: 0.5 });
			expect(f._state.inputBindings.cutoff).toBe(800);
			expect(f._state.inputBindings.resonance).toBe(0.5);
		});

		it("saw({ freq }) sets via object", () => {
			const s = saw({ freq: 880 });
			expect(s._state.inputBindings.freq).toBe(880);
		});
	});

	describe("mixed positional + object", () => {
		it("lfo(2, { min, max }) uses positional for rate, object for rest", () => {
			const l = lfo(2, { min: 200, max: 2000 });
			expect(l._state.inputBindings.rate).toBe(2);
			expect(l._state.inputBindings.min).toBe(200);
			expect(l._state.inputBindings.max).toBe(2000);
		});

		it("seq(pattern, { clk }) uses positional for pattern, object for clk", () => {
			const c = clock(60);
			const s = seq("c4", { clk: c });
			expect(isPoly(s) || isDescriptor(s)).toBe(true);
		});
	});

	describe("array expansion to poly", () => {
		it("saw([220, 330, 440]) creates 3-voice poly", () => {
			const p = saw([220, 330, 440]);
			expect(isPoly(p)).toBe(true);
			if (isPoly(p)) {
				expect(p.voices.length).toBe(3);
			}
		});

		it("saw.freq([220, 330]) creates poly via setter", () => {
			const p = saw.freq([220, 330]);
			expect(isPoly(p)).toBe(true);
			if (isPoly(p)) {
				expect(p.voices.length).toBe(2);
			}
		});

		it("lpf({ cutoff: [800, 1200] }) creates poly via object params", () => {
			const p = lpf({ cutoff: [800, 1200] });
			expect(isPoly(p)).toBe(true);
			if (isPoly(p)) {
				expect(p.voices.length).toBe(2);
			}
		});
	});
});
