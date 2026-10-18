/**
 * Patterns as knobs (MANIFESTO §4.3): a `P` passed to any module input lifts
 * to `seq(pattern).out` read at the ambient clock. It steps exactly at
 * pattern boundaries, holds the last value through rests, and before its
 * first event holds the most recent earlier event, found by looking back.
 * A stack widens the module it feeds.
 */

import { factory, p, runProgram, tempo } from "@/api";
import { getRegistry } from "@/dsp/define";
import { InterpreterEngine } from "@/runtime/interpreter-engine";
import { renderTap } from "@/runtime/render";
import { describe, expect, it } from "vitest";
import { SR, nodeIndex } from "../../testing/bridge-helpers";

const sin = factory("sin");
const CYCLE = 48000; // one bar at 240 bpm, 48 kHz

describe("pattern as a knob", () => {
	it("lifts to a seq that steps at pattern boundaries (with alternation)", () => {
		const program = runProgram(() => {
			tempo(240);
			sin({ fm: p`110 220 <330 440>` }).out();
		});
		const knob = nodeIndex(program, "seq");
		const tap = renderTap(program, knob, "out", 0, 2 * CYCLE);
		const third = CYCLE / 3;
		expect(tap[Math.floor(third * 0.5)]).toBe(110);
		expect(tap[Math.floor(third * 1.5)]).toBe(220);
		expect(tap[Math.floor(third * 2.5)]).toBe(330);
		expect(tap[CYCLE + Math.floor(third * 2.5)]).toBe(440); // <> alternates per cycle
		// the 110 -> 220 step lands on the boundary
		const step = tap.findIndex((v) => v === 220);
		expect(Math.abs(step - third)).toBeLessThanOrEqual(2);
	});

	it("reads the last earlier event before its first one: `~ 800 ~ 400` is 400 at the start", () => {
		const program = runProgram(() => {
			tempo(240);
			sin({ fm: p`~ 800 ~ 400` }).out();
		});
		const tap = renderTap(program, nodeIndex(program, "seq"), "out", 0, CYCLE);
		const quarter = CYCLE / 4;
		expect(tap[Math.floor(quarter * 0.5)]).toBe(400);
		expect(tap[Math.floor(quarter * 1.5)]).toBe(800);
		expect(tap[Math.floor(quarter * 2.5)]).toBe(800); // held through the rest
		expect(tap[Math.floor(quarter * 3.5)]).toBe(400);
	});

	it("a knob added mid-rest by a re-eval holds the previous event's value", () => {
		const bare = runProgram(() => {
			tempo(240);
			sin({ fm: 0 }).out();
		});
		const knobbed = runProgram(() => {
			tempo(240);
			sin({ fm: p`300 ~ ~ ~` }).out();
		});
		const old = new InterpreterEngine(bare, SR, getRegistry());
		const frame = new Float32Array(2);
		for (let k = 0; k < Math.floor(CYCLE * 2.6); k++) old.tick(frame); // 2.6 bars: mid-rest
		const swapped = new InterpreterEngine(knobbed, SR, getRegistry(), old.collectState());
		swapped.tick(frame);
		expect(swapped.peek(nodeIndex(knobbed, "seq"), "out", 0)).toBe(300);
	});

	it("a stack widens the module it feeds", () => {
		const program = runProgram(() => {
			tempo(240);
			sin({ fm: p`[100, 200]` }).out();
		});
		expect(program.nodes[nodeIndex(program, "sin")]?.width).toBe(2);
		const knob = nodeIndex(program, "seq");
		expect(renderTap(program, knob, "out", 0, 100)[50]).toBe(100);
		expect(renderTap(program, knob, "out", 1, 100)[50]).toBe(200);
	});
});
