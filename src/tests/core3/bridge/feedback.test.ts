/**
 * Feedback through the bridge: the clock's beat trig excites a one-pole
 * feedback loop (y = trig + 0.6·y[-1] via loop's z-cut edge). The impulse
 * response is a clean geometric decay — non-silent, bounded, no NaN/Inf.
 */

import { clock, loop, mod, runProgram } from "@/core3/api";
import { render, renderTap } from "@/core3/runtime/render";
import { describe, expect, it } from "vitest";
import { allFinite, nodeIndex } from "./helpers";

describe("bridge feedback", () => {
	const program = runProgram(() => {
		const c = clock(30); // one trig at sample 0, next 2 s later
		loop((fb) => c.trig.add(fb.mul(0.6))).out();
	});
	const ai = nodeIndex(program, "add");
	const tap = renderTap(program, ai, "out", 0, 4800);

	it("rings with a geometric decay from the trigger impulse", () => {
		expect(tap[0]).toBeCloseTo(1, 6);
		expect(tap[1]).toBeCloseTo(0.6, 6);
		expect(tap[10]).toBeCloseTo(0.6 ** 10, 6);
		for (let i = 1; i < 100; i++) {
			expect(tap[i] as number).toBeLessThan(tap[i - 1] as number);
			expect(tap[i] as number).toBeGreaterThan(0);
		}
	});

	it("a chained .z1() is exactly one sample of delay", () => {
		const program2 = runProgram(() => {
			const c = clock(30);
			c.trig.z1().out();
		});
		const zi = nodeIndex(program2, "z1");
		const tap2 = renderTap(program2, zi, "out", 0, 4);
		expect(Array.from(tap2)).toEqual([0, 1, 0, 0]); // trig at sample 0 emerges at sample 1
	});

	it("z1 fed a per-sample lambda is a loud compile error (it cannot be delayed)", () => {
		expect(() =>
			runProgram(() => {
				mod("z1")()((_s: unknown, sr: number, t: number) => Math.round(t * sr)).out();
			}),
		).toThrow(/z1: a per-sample lambda cannot be delayed/);
	});

	it("stays finite everywhere in a 1 s render", () => {
		const { l, r } = render(program, 1);
		expect(allFinite(l)).toBe(true);
		expect(allFinite(r)).toBe(true);
		expect(Math.max(...l.slice(0, 100).map(Math.abs))).toBeGreaterThan(0); // non-silent
	});
});
