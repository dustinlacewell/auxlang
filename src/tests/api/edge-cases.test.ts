/**
 * Edge Cases Tests
 * Tests: empty calls, ID freshness, lambda vs descriptor detection, polyphonic flag
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as api from "../../editor/api";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";
import { isOutputRef } from "../../descriptor/guards/is-output-ref";
import { resetIdCounter } from "../../descriptor/identity";
import { isPoly } from "../../descriptor/poly";
import { isPolyOutputRef } from "../../descriptor/proxy/poly-output-proxy";
import { clearRegistry } from "../../descriptor/registry";

const { saw, lpf, noise, seq, clock } = api;

describe("Edge Cases", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	describe("empty calls", () => {
		it("saw() uses defaults from spec", () => {
			const s = saw();
			expect(s._state.spec.inputs.freq.default).toBe(440);
			expect(s._state.inputBindings.freq).toBeUndefined();
		});

		it("lpf() uses defaults from spec", () => {
			const f = lpf();
			expect(f._state.spec.inputs.cutoff.default).toBe(1000);
			expect(f._state.inputBindings.cutoff).toBeUndefined();
		});
	});

	describe("device ID freshness", () => {
		it("each call creates fresh ID", () => {
			resetIdCounter();
			const a = noise();
			const b = noise();
			expect(a._state.id).not.toBe(b._state.id);
		});
	});

	describe("lambda vs descriptor detection", () => {
		it("isDescriptor(lambda) is false", () => {
			const fn = (_s: unknown, _sr: number, _t: number) => 1;
			expect(isDescriptor(fn)).toBe(false);
		});

		it("isDescriptor(descriptor) is true", () => {
			expect(isDescriptor(saw(440))).toBe(true);
		});
	});

	describe("polyphonic device flag", () => {
		it("spread receives entire poly", () => {
			const p = saw([220, 330, 440]).spread();
			expect(isPoly(p)).toBe(true);
			if (isPoly(p)) {
				expect(p.voices.length).toBe(2);
			}
		});
	});

	describe("type guards", () => {
		it("isOutputRef correctly identifies OutputRef", () => {
			const s = saw(440);
			expect(isOutputRef(s.audio)).toBe(true);
			expect(isOutputRef(440)).toBe(false);
			expect(isOutputRef(s)).toBe(false);
			expect(isOutputRef(null)).toBe(false);
		});

		it("isPoly correctly identifies Poly", () => {
			const p = saw([220, 330]);
			const s = saw(440);
			expect(isPoly(p)).toBe(true);
			expect(isPoly(s)).toBe(false);
			expect(isPoly(440)).toBe(false);
			expect(isPoly(null)).toBe(false);
		});

		it("isPolyOutputRef correctly identifies PolyOutputRef", () => {
			const polySec = clock(120).seq("{c4,e4}");
			expect(isPolyOutputRef((polySec as any).gate)).toBe(true);
			expect(isPolyOutputRef(saw(440).audio)).toBe(false);
			expect(isPolyOutputRef(440)).toBe(false);
		});

		it("isDescriptor correctly identifies Descriptor", () => {
			expect(isDescriptor(saw(440))).toBe(true);
			expect(isDescriptor(saw(440).audio)).toBe(false);
			expect(isDescriptor(440)).toBe(false);
			expect(isDescriptor(() => 1)).toBe(false);
		});
	});
});
