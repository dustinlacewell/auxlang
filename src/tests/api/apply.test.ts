/**
 * Apply Pattern Tests
 * Tests: descriptor apply, poly apply, capturing intermediates
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as api from "../../editor/api";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";
import { resetIdCounter } from "../../descriptor/identity";
import { isPoly } from "../../descriptor/poly";
import { clearOutputs, collectStereoGraph } from "../../graph/out";
import { clearRegistry } from "../../descriptor/registry";

const { saw, seq, clock } = api;

describe("Apply Pattern", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
		clearOutputs();
	});

	describe("descriptor apply", () => {
		it("descriptor.apply(fn) passes descriptor to callback", () => {
			let captured: unknown = null;
			const result = clock(120).apply((c) => {
				captured = c;
				return "test";
			});
			expect(result).toBe("test");
			expect(isDescriptor(captured)).toBe(true);
		});
	});

	describe("poly apply", () => {
		it("poly.apply(fn) passes poly to callback", () => {
			let captured: unknown = null;
			const result = saw([220, 330]).apply((p) => {
				captured = p;
				return "poly-test";
			});
			expect(result).toBe("poly-test");
			expect(isPoly(captured)).toBe(true);
		});
	});

	describe("capturing intermediate values", () => {
		it("nested apply captures intermediates", () => {
			clock(120).apply((c) =>
				seq("c4", { clk: c }).apply((s) => {
					if (isDescriptor(s)) {
						s.saw().gain({ level: s.gate.adsr() }).out();
					}
				}),
			);

			const stereo = collectStereoGraph();
			expect(stereo).not.toBeNull();
		});
	});
});
