/**
 * Input Setting Tests
 * Tests: callable, setters, descriptor/OutputRef/lambda inputs, poly distribution
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as api from "../../editor/api";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";
import { isOutputRef } from "../../descriptor/guards/is-output-ref";
import { resetIdCounter } from "../../descriptor/identity";
import { isPoly } from "../../descriptor/poly";
import { clearOutputs } from "../../graph/out";
import { clearRegistry } from "../../descriptor/registry";
import type { AnyDescriptor } from "../../descriptor/types";

const { saw, lfo, lpf, seq, clock, osc } = api;

describe("Input Setting", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
		clearOutputs();
	});

	describe("callable (default input)", () => {
		it("saw(440) sets default input via call", () => {
			const s = saw(440);
			expect(s._state.inputBindings.freq).toBe(440);
		});

		it("lpf(audio) chains via call", () => {
			const audio = saw(440);
			const f = lpf(audio);
			expect(isOutputRef(f._state.inputBindings.input)).toBe(true);
		});
	});

	describe("input setter methods", () => {
		it("saw.freq(440) sets via setter", () => {
			const s = saw.freq(440);
			expect(s._state.inputBindings.freq).toBe(440);
		});

		it("lpf.cutoff(800).resonance(0.5) chains setters", () => {
			const f = lpf.cutoff(800).resonance(0.5);
			expect(f._state.inputBindings.cutoff).toBe(800);
			expect(f._state.inputBindings.resonance).toBe(0.5);
		});
	});

	describe("descriptor as input", () => {
		it("saw(lfo()) normalizes to OutputRef", () => {
			const l = lfo();
			const s = saw(l);
			const binding = s._state.inputBindings.freq;
			expect(isOutputRef(binding)).toBe(true);
			if (isOutputRef(binding)) {
				expect(binding.descriptorId).toBe(l._state.id);
				expect(binding.outputName).toBe("cv");
			}
		});

		it("lpf({ cutoff: lfo() }) normalizes in params", () => {
			const l = lfo();
			const f = lpf({ cutoff: l });
			const binding = f._state.inputBindings.cutoff;
			expect(isOutputRef(binding)).toBe(true);
		});
	});

	describe("OutputRef as input", () => {
		it("saw(seq.cv) uses explicit output", () => {
			const s = seq("c4").clk(clock(120));
			const sawInst = saw(s.cv);
			const binding = sawInst._state.inputBindings.freq;
			expect(isOutputRef(binding)).toBe(true);
		});

		it("lpf({ input: osc.audio }) uses in params", () => {
			const o = osc(440);
			const f = lpf({ input: o.audio });
			const binding = f._state.inputBindings.input;
			expect(isOutputRef(binding)).toBe(true);
			if (isOutputRef(binding)) {
				expect(binding.outputName).toBe("audio");
			}
		});
	});

	describe("lambda as input", () => {
		it("saw(lambda) accepts per-sample function", () => {
			const s = saw((_state, _sr, t) => 200 + t * 50);
			expect(typeof s._state.inputBindings.freq).toBe("function");
		});

		it("lpf({ cutoff: lambda }) accepts in params", () => {
			const f = lpf({
				cutoff: (_state, _sr, t) => Math.sin(t) * 1000 + 1000,
			});
			expect(typeof f._state.inputBindings.cutoff).toBe("function");
		});
	});

	describe("poly distribution on input", () => {
		it("poly.freq([...]) distributes array to voices", () => {
			const p = saw([100, 200, 300]);
			const p2 = p.freq([440, 550, 660]);
			expect(isPoly(p2)).toBe(true);
			if (isPoly(p2)) {
				const v0 = p2.voices[0] as AnyDescriptor;
				const v1 = p2.voices[1] as AnyDescriptor;
				expect(v0._state.inputBindings.freq).toBe(440);
				expect(v1._state.inputBindings.freq).toBe(550);
			}
		});
	});

	describe("PolyOutputRef as input", () => {
		it("saw(polySeq.cv) expands to poly", () => {
			const s = clock(120).seq("{c4,e4}");
			const saws = saw((s as any).cv);
			expect(isPoly(saws)).toBe(true);
			if (isPoly(saws)) {
				expect(saws.voices.length).toBe(2);
			}
		});
	});

	describe("Poly as input", () => {
		it("lpf(polySaw) expands to poly", () => {
			const polySaw = saw([220, 330]);
			const filters = lpf(polySaw);
			expect(isPoly(filters)).toBe(true);
			if (isPoly(filters)) {
				expect(filters.voices.length).toBe(2);
			}
		});
	});

	describe("lambda via setter", () => {
		it("saw.freq(lambda) accepts per-sample function", () => {
			const s = saw.freq((_state, _sr, t) => 200 + t * 50);
			expect(typeof s._state.inputBindings.freq).toBe("function");
		});
	});
});
