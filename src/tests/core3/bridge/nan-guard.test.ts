/**
 * The master audio path never emits NaN/Inf, even under adversarial inputs:
 * user lambdas returning NaN, and diverging (gain > 1) feedback loops whose
 * internal signal reaches Infinity. The out module flushes non-finite bus
 * samples to silence and resets its DC blocker (Inf - Inf = NaN otherwise).
 */

import { loop, mod, runProgram, saw, sin } from "@/core3/api";
import { render } from "@/core3/runtime/render";
import { describe, expect, it } from "vitest";
import { allFinite } from "./helpers";

describe("NaN/Inf never reach the rendered output", () => {
	it("a lambda returning NaN into osc.pitch stays out of l/r", () => {
		const program = runProgram(() => {
			sin()
				.pitch((_s: unknown, _sr: number, t: number) => (t < 0.005 ? 60 : Number.NaN))
				.out();
		});
		const { l, r } = render(program, 0.05);
		expect(allFinite(l)).toBe(true);
		expect(allFinite(r)).toBe(true);
	});

	it("a single-sample NaN into lpf.cutoff stays out of l/r", () => {
		const program = runProgram(() => {
			saw(220)
				.lpf({
					cutoff: (_s: unknown, sr: number, t: number) =>
						Math.round(t * sr) === 50 ? Number.NaN : 800,
				})
				.out();
		});
		const { l, r } = render(program, 0.05);
		expect(allFinite(l)).toBe(true);
		expect(allFinite(r)).toBe(true);
	});

	it("an unstable feedback loop (gain 1.1) renders finite for a full second", () => {
		const program = runProgram(() => {
			const fb = loop((fed) =>
				mod("add")(mod("mul")(1.1)(fed))((_s: unknown, _sr: number, t: number) =>
					t === 0 ? 1 : 0,
				),
			);
			fb.out();
		});
		const { l, r } = render(program, 1);
		expect(allFinite(l)).toBe(true);
		expect(allFinite(r)).toBe(true);
		for (const v of l) expect(Math.abs(v)).toBeLessThanOrEqual(1);
	});
});
