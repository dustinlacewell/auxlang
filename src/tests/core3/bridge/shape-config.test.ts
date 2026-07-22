/**
 * Module config defaults must reach tick through the ENGINE path (the module
 * test driver feeds spec.config directly, so only render exposes the merge).
 * Regression: all osc shapes rendered as the tri fall-through when node.config
 * was passed unmerged. Also covers lfo's shape config.
 */

import "@/core3/modules/all";

import { factory, runProgram } from "@/core3/api";
import { render } from "@/core3/runtime/render";
import { describe, expect, it } from "vitest";

const renderOf = (fn: () => void) => render(runProgram(fn), 0.02).l;

const differ = (a: Float32Array, b: Float32Array) => a.some((v, i) => v !== b[i]);

describe("shape config through the engine", () => {
	it("sin/tri/sqr/saw render distinct waveforms", () => {
		const [sin, tri, sqr, saw] = ["sin", "tri", "sqr", "saw"].map((name) => {
			const f = factory(name);
			return renderOf(() => f({ freq: 220 }).out());
		});
		expect(differ(sin!, tri!)).toBe(true);
		expect(differ(sin!, sqr!)).toBe(true);
		expect(differ(sin!, saw!)).toBe(true);
		expect(differ(tri!, sqr!)).toBe(true);
	});

	it("lfo shape config selects the waveform", () => {
		const lfo = factory("lfo");
		const dflt = renderOf(() => lfo({ freq: 220 }).out());
		const asSin = renderOf(() => lfo({ freq: 220, shape: "sin" }).out());
		const asSqr = renderOf(() => lfo({ freq: 220, shape: "sqr" }).out());
		expect(differ(dflt, asSin)).toBe(false); // sin is the default
		expect(differ(dflt, asSqr)).toBe(true);
	});
});
