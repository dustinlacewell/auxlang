/**
 * Pattern-as-signal: a `P` passed to any module input lifts into a patsig node
 * clocked by the ambient clock. The signal sample-and-holds the pattern value,
 * changing exactly at pattern boundaries; before the first event ever it is 0.
 */

import { clock, factory, p, runProgram } from "@/core3/api";
import { renderTap } from "@/core3/runtime/render";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "./helpers";

const sin = factory("sin");
const CYCLE = 48000; // one beat at 60 bpm, 48 kHz

describe("patsig", () => {
	it("a pattern-modulated parameter steps at pattern boundaries (with alternation)", () => {
		const program = runProgram(() => {
			clock(60);
			sin({ freq: p`110 220 <330 440>` }).out();
		});
		const ps = nodeIndex(program, "patsig");
		const tap = renderTap(program, ps, "out", 0, 2 * CYCLE);
		const third = CYCLE / 3;
		expect(tap[Math.floor(third * 0.5)]).toBe(110);
		expect(tap[Math.floor(third * 1.5)]).toBe(220);
		expect(tap[Math.floor(third * 2.5)]).toBe(330);
		expect(tap[CYCLE + Math.floor(third * 2.5)]).toBe(440); // <> alternates per cycle
		// the 110 -> 220 step lands on the boundary
		const step = tap.findIndex((v) => v === 220);
		expect(Math.abs(step - third)).toBeLessThanOrEqual(2);
	});

	it("is 0 before the first event ever, then holds the last value through gaps", () => {
		const program = runProgram(() => {
			clock(60);
			sin({ freq: p`~ 220` }).out();
		});
		const ps = nodeIndex(program, "patsig");
		const tap = renderTap(program, ps, "out", 0, 2 * CYCLE);
		expect(tap[Math.floor(CYCLE * 0.25)]).toBe(0); // before any event
		expect(tap[Math.floor(CYCLE * 0.75)]).toBe(220);
		expect(tap[CYCLE + Math.floor(CYCLE * 0.25)]).toBe(220); // held through the next rest
	});
});
