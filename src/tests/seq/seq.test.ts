import { beforeEach, describe, expect, it } from "vitest";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";
import { resetIdCounter } from "../../descriptor/identity";
import { type PolyDescriptor, isPoly } from "../../descriptor/poly";
import type { AnyDescriptor } from "../../descriptor/types";
import { seq } from "../../devices/seq/seq";

describe("seq", () => {
	beforeEach(() => {
		resetIdCounter();
	});

	describe("mono patterns", () => {
		it("returns mono descriptor for single note", () => {
			const s = seq("c4");
			expect(isDescriptor(s)).toBe(true);
			expect(isPoly(s)).toBe(false);
		});

		it("returns mono descriptor for sequence", () => {
			const s = seq("c4 e4 g4");
			expect(isDescriptor(s)).toBe(true);
			expect(isPoly(s)).toBe(false);
		});

		it("returns mono descriptor for alternation", () => {
			const s = seq("<c4 e4 g4>");
			expect(isDescriptor(s)).toBe(true);
			expect(isPoly(s)).toBe(false);
		});

		it("mono seq has cv/gate/trig outputs", () => {
			const s = seq("c4");
			if (!isPoly(s)) {
				expect(s._state.spec.outputs).toContain("cv");
				expect(s._state.spec.outputs).toContain("gate");
				expect(s._state.spec.outputs).toContain("trig");
			} else {
				expect.fail("Expected mono descriptor");
			}
		});
	});

	describe("poly patterns", () => {
		it("returns poly for 2-voice stack", () => {
			const s = seq("{c4, e4}");
			expect(isPoly(s)).toBe(true);
			if (isPoly(s)) {
				expect(s.voices.length).toBe(2);
			}
		});

		it("returns poly for 3-voice stack", () => {
			const s = seq("{c4, e4, g4}");
			expect(isPoly(s)).toBe(true);
			if (isPoly(s)) {
				expect(s.voices.length).toBe(3);
			}
		});

		it("each voice is a mono descriptor", () => {
			const s = seq("{c4, e4}");
			expect(isPoly(s)).toBe(true);
			if (isPoly(s)) {
				for (const voice of s.voices) {
					expect(isDescriptor(voice)).toBe(true);
					expect(isPoly(voice)).toBe(false);
				}
			}
		});

		it("handles nested stacks", () => {
			// {c4, {e4, g4}} = 3 voices
			const s = seq("{c4, {e4, g4}}");
			expect(isPoly(s)).toBe(true);
			if (isPoly(s)) {
				expect(s.voices.length).toBe(3);
			}
		});

		it("handles stack in sequence", () => {
			// c4 {e4, g4} a4 - stack makes it poly
			const s = seq("c4 {e4, g4} a4");
			expect(isPoly(s)).toBe(true);
			if (isPoly(s)) {
				expect(s.voices.length).toBe(2);
			}
		});
	});

	describe("chaining", () => {
		it("mono seq is chainable", () => {
			const s = seq("c4");
			if (!isPoly(s)) {
				expect(s._state.spec.defaultOutput).toBe("cv");
				// Can access .cv output
				expect((s as unknown as Record<string, unknown>).cv).toBeDefined();
			} else {
				expect.fail("Expected mono descriptor");
			}
		});

		it("poly seq voices are chainable", () => {
			const s = seq("{c4, e4}");
			expect(isPoly(s)).toBe(true);
			if (isPoly(s)) {
				// Each voice should have cv/gate/trig
				for (const voice of s.voices) {
					expect((voice as AnyDescriptor)._state.spec.outputs).toContain("cv");
					expect((voice as AnyDescriptor)._state.spec.outputs).toContain("gate");
					expect((voice as AnyDescriptor)._state.spec.outputs).toContain("trig");
				}
			}
		});
	});
});
