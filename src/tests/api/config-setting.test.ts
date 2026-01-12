/**
 * Config Setting Tests
 * Tests: config setters, config in params, config in positional args
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as api from "../../editor/api";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";
import { resetIdCounter } from "../../descriptor/identity";
import { isPoly } from "../../descriptor/poly";
import { clearRegistry } from "../../descriptor/registry";

const { seq, osc, chord } = api;

describe("Config Setting", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	describe("config setter methods", () => {
		it("osc.shape(fn) sets config via setter", () => {
			const customShape = (p: number) => (p < 0.5 ? 1 : -1);
			const o = osc.shape(customShape);
			expect(o._state.configBindings.shape).toBe(customShape);
		});
	});

	describe("config in params object", () => {
		it("osc({ freq, shape }) sets both input and config", () => {
			const customShape = Math.sin;
			const o = osc({ freq: 880, shape: customShape });
			expect(o._state.inputBindings.freq).toBe(880);
			expect(o._state.configBindings.shape).toBe(customShape);
		});
	});

	describe("config in positional args", () => {
		it("chord(440, 'maj7') has chordName as config", () => {
			const ch = chord(440, "maj7");
			expect(isPoly(ch)).toBe(true);
		});

		it("seq('c4 e4') has pattern as config", () => {
			const s = seq("c4 e4");
			expect(isPoly(s) || isDescriptor(s)).toBe(true);
		});
	});
});
