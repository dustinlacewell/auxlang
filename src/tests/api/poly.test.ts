/**
 * Poly Behavior Tests
 * Tests: creation, chaining, setters, output access, param distribution, voices
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as api from "../../editor/api";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";
import { isOutputRef } from "../../descriptor/guards/is-output-ref";
import { resetIdCounter } from "../../descriptor/identity";
import { isPoly } from "../../descriptor/poly";
import { isPolyOutputRef } from "../../descriptor/proxy/poly-output-proxy";
import { clearOutputs } from "../../graph/out";
import { clearRegistry } from "../../descriptor/registry";
import type { AnyDescriptor } from "../../descriptor/types";

const { saw, lpf, seq, clock, poly } = api;

describe("Poly Behavior", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
		clearOutputs();
	});

	describe("poly creation - explicit", () => {
		it("poly([saw(220), saw(330)]) creates poly", () => {
			const p = poly([saw(220), saw(330)]);
			expect(isPoly(p)).toBe(true);
			expect(p.voices.length).toBe(2);
		});
	});

	describe("poly creation - array expansion", () => {
		it("saw([220, 330]) via positional", () => {
			expect(isPoly(saw([220, 330]))).toBe(true);
		});

		it("saw.freq([220, 330]) via input setter", () => {
			expect(isPoly(saw.freq([220, 330]))).toBe(true);
		});

		it("lpf({ cutoff: [800, 1200] }) via object", () => {
			expect(isPoly(lpf({ cutoff: [800, 1200] }))).toBe(true);
		});
	});

	describe("poly creation - pattern syntax", () => {
		it("seq('{c4,e4}') stack creates poly", () => {
			const s = clock(120).seq("{c4,e4}");
			expect(isPoly(s)).toBe(true);
			if (isPoly(s)) {
				expect(s.voices.length).toBe(2);
			}
		});
	});

	describe("poly chaining (device forwarding)", () => {
		it("polySaw.lpf() chains to each voice", () => {
			const p = saw([220, 330]).lpf();
			expect(isPoly(p)).toBe(true);
			if (isPoly(p)) {
				expect(p.voices.length).toBe(2);
				expect(isDescriptor(p.voices[0])).toBe(true);
			}
		});
	});

	describe("poly input setters", () => {
		it("poly.freq(880) broadcasts to all", () => {
			const p = saw([220, 330]).freq(880);
			expect(isPoly(p)).toBe(true);
			if (isPoly(p)) {
				const v0 = p.voices[0] as AnyDescriptor;
				const v1 = p.voices[1] as AnyDescriptor;
				expect(v0._state.inputBindings.freq).toBe(880);
				expect(v1._state.inputBindings.freq).toBe(880);
			}
		});

		it("seq(poly).clk(clock) forwards input setter", () => {
			const s = seq("{c3,g3}").clk(clock(60));
			expect(isPoly(s)).toBe(true);
		});
	});

	describe("poly output access", () => {
		it("polySeq.gate returns PolyOutputRef", () => {
			const s = clock(120).seq("{c4,e4}");
			expect(isPolyOutputRef(s.gate)).toBe(true);
		});

		it("polySeq.cv returns PolyOutputRef", () => {
			const s = clock(120).seq("{c4,e4}");
			expect(isPolyOutputRef(s.cv)).toBe(true);
		});
	});

	describe("PolyOutputRef chaining", () => {
		it("seq('{c4,e4}').gate.adsr() creates poly of ADSRs", () => {
			const s = clock(120).seq("{c4,e4}");
			const env = s.gate.adsr();
			expect(isPoly(env)).toBe(true);
			if (isPoly(env)) {
				expect(env.voices.length).toBe(2);
			}
		});

		it("seq('{c4,e4}').cv.saw() creates poly of saws", () => {
			const s = clock(120).seq("{c4,e4}");
			const saws = s.cv.saw();
			expect(isPoly(saws)).toBe(true);
		});

		it("PolyOutputRef chaining with params", () => {
			const s = clock(120).seq("{c4,e4}");
			const env = s.gate.adsr({ attack: 0.1, release: 0.5 });
			expect(isPoly(env)).toBe(true);
			if (isPoly(env)) {
				const v0 = env.voices[0] as AnyDescriptor;
				expect(v0._state.inputBindings.attack).toBe(0.1);
				expect(v0._state.inputBindings.release).toBe(0.5);
			}
		});
	});

	describe("param distribution", () => {
		it("array distributes to voices", () => {
			const p = saw([220, 330]).gain([0.5, 0.8]);
			expect(isPoly(p)).toBe(true);
			if (isPoly(p)) {
				const v0 = p.voices[0] as AnyDescriptor;
				const v1 = p.voices[1] as AnyDescriptor;
				expect(v0._state.inputBindings.level).toBe(0.5);
				expect(v1._state.inputBindings.level).toBe(0.8);
			}
		});

		it("poly distributes per-voice", () => {
			const s = clock(100).seq("{e2,b2}");
			const envs = s.gate.adsr();
			const saws = s.cv.saw();
			const result = saws.gain({ level: envs });
			expect(isPoly(result)).toBe(true);
			if (isPoly(result)) {
				const v0 = result.voices[0] as AnyDescriptor;
				const v1 = result.voices[1] as AnyDescriptor;
				expect(isOutputRef(v0._state.inputBindings.level)).toBe(true);
				expect(isOutputRef(v1._state.inputBindings.level)).toBe(true);
				if (
					isOutputRef(v0._state.inputBindings.level) &&
					isOutputRef(v1._state.inputBindings.level)
				) {
					expect(v0._state.inputBindings.level.descriptorId).not.toBe(
						v1._state.inputBindings.level.descriptorId,
					);
				}
			}
		});
	});

	describe("wraparound distribution", () => {
		it("4 voices, 2 element array wraps around", () => {
			const p = saw([100, 200, 300, 400]).gain([0.5, 0.9]);
			expect(isPoly(p)).toBe(true);
			if (isPoly(p)) {
				const v0 = p.voices[0] as AnyDescriptor;
				const v1 = p.voices[1] as AnyDescriptor;
				const v2 = p.voices[2] as AnyDescriptor;
				const v3 = p.voices[3] as AnyDescriptor;
				expect(v0._state.inputBindings.level).toBe(0.5);
				expect(v1._state.inputBindings.level).toBe(0.9);
				expect(v2._state.inputBindings.level).toBe(0.5);
				expect(v3._state.inputBindings.level).toBe(0.9);
			}
		});
	});

	describe("voices property", () => {
		it("poly.voices returns array", () => {
			const p = saw([220, 330, 440]);
			expect(isPoly(p)).toBe(true);
			if (isPoly(p)) {
				expect(Array.isArray(p.voices)).toBe(true);
				expect(p.voices.length).toBe(3);
			}
		});
	});

	describe("nested poly flattening", () => {
		it("poly([poly([a,b]), c]) flattens to 3 voices", () => {
			const inner = poly([saw(220), saw(330)]);
			const outer = poly([inner, saw(440)]);
			expect(isPoly(outer)).toBe(true);
			if (isPoly(outer)) {
				expect(outer.voices.length).toBe(3);
			}
		});
	});

	describe("mixed voice types", () => {
		it("poly([number, descriptor, lambda]) creates mixed poly", () => {
			const lambda = (_s: unknown, _sr: number, t: number) => 220 + t * 10;
			const p = poly([440, saw(330), lambda]);
			expect(isPoly(p)).toBe(true);
			expect(p.voices.length).toBe(3);
			expect(p.voices[0]).toBe(440);
			expect(isDescriptor(p.voices[1])).toBe(true);
			expect(typeof p.voices[2]).toBe("function");
		});

		it("mixed poly chaining applies to all voices via device factory", () => {
			// When chaining .saw() on mixed poly, all voices go through saw factory
			const p = poly([440, 550]);
			const saws = p.saw();
			expect(isPoly(saws)).toBe(true);
			if (isPoly(saws)) {
				expect(saws.voices.length).toBe(2);
				expect(isDescriptor(saws.voices[0])).toBe(true);
				expect(isDescriptor(saws.voices[1])).toBe(true);
			}
		});
	});
});
