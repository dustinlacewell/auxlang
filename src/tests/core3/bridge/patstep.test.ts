/**
 * patstep: trigger-domain stepping. Values advance one per incoming trigger
 * (here the clock's beat trig), hold between triggers, and wrap.
 */

import { clock, patstep, runProgram } from "@/core3/api";
import { renderTap } from "@/core3/runtime/render";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "./helpers";

const BEAT = 24000; // 120 bpm at 48 kHz

describe("patstep", () => {
	const program = runProgram(() => {
		const c = clock(120);
		patstep("c4 e4 g4", c.trig).out();
	});
	const ps = nodeIndex(program, "patstep");
	const tap = renderTap(program, ps, "out", 0, 4 * BEAT);

	it("advances one value per trigger and wraps", () => {
		expect(tap[100]).toBe(60);
		expect(tap[BEAT + 100]).toBe(64);
		expect(tap[2 * BEAT + 100]).toBe(67);
		expect(tap[3 * BEAT + 100]).toBe(60); // wrapped
	});

	it("holds between triggers — no phase-driven movement", () => {
		for (const i of [500, 6000, 12000, 18000, 23900]) expect(tap[i]).toBe(60);
		for (const i of [500, 6000, 12000, 18000]) expect(tap[BEAT + i]).toBe(64);
	});
});
