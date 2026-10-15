/**
 * Oscillators are pitch-first: positional arg 0 is semis, so a literal, a
 * pattern note, and an exact `hz(440)` all agree on what A440 means. The lfo
 * module is the frequency-first counterpart for Hz-rate modulation.
 */

import "@/core3/modules/all";

import { factory, p, runProgram, tempo } from "@/core3/api";
import { render } from "@/core3/runtime/render";
import { hz } from "@/core3/units/tag";
import { describe, expect, it } from "vitest";

const sin = factory("sin");
const lfo = factory("lfo");

const renderOf = (fn: () => void) => render(runProgram(fn), 0.1);

describe("osc pitch-first positional", () => {
	it("sin(69) equals sin(hz(440))", () => {
		const a = renderOf(() => sin(69).out());
		const b = renderOf(() => sin(hz(440)).out());
		expect(a.l).toEqual(b.l);
	});

	it("sin(p`a4`) equals sin(hz(440))", () => {
		const a = renderOf(() => {
			tempo(120);
			sin(p`a4`).out();
		});
		const b = renderOf(() => sin(hz(440)).out());
		expect(a.l).toEqual(b.l);
	});

	it("lfo(2, 100, 800) is positional freq/min/max in Hz", () => {
		const a = renderOf(() => sin({ fm: lfo(2, 100, 800) }).out());
		const b = renderOf(() => sin({ fm: lfo({ freq: 2, min: 100, max: 800 }) }).out());
		expect(a.l).toEqual(b.l);
	});

	it("sin({ freq: 440 }) is a loud unknown-port error", () => {
		expect(() => runProgram(() => sin({ freq: 440 }).out())).toThrow(
			/sin: unknown parameter 'freq'.*inputs: \[pitch, fm, min, max, phase\]/,
		);
	});
});
