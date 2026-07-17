/**
 * seq end-to-end: clock(120) drives seq("c4 e4 g4 b4") — one pattern cycle per
 * beat (cycle = floor(phase)). At 48 kHz that is 24000 samples per cycle,
 * 6000 per note. pitch sample-and-holds semitones, gate opens per event with a
 * fixed 1 ms (48-sample) pre-release gap, trig is single-sample per onset.
 */

import { clock, runProgram, seq } from "@/core3/api";
import { renderTap } from "@/core3/runtime/render";
import { describe, expect, it } from "vitest";
import { countOnes, nodeIndex } from "./helpers";

const CYCLE = 24000; // one beat at 120 bpm, 48 kHz
const NOTE = CYCLE / 4;

function build(pattern: string) {
	const program = runProgram(() => {
		clock(120);
		seq(pattern).tri().out();
	});
	return { program, seq: nodeIndex(program, "seq") };
}

describe("seq basics", () => {
	const { program, seq: si } = build("c4 e4 g4 b4");

	it("pitch sample-and-holds 60/64/67/71 at note boundaries, repeating per cycle", () => {
		const pitch = renderTap(program, si, "pitch", 0, 2 * CYCLE);
		expect(pitch[Math.floor(NOTE * 0.5)]).toBe(60);
		expect(pitch[Math.floor(NOTE * 1.5)]).toBe(64);
		expect(pitch[Math.floor(NOTE * 2.5)]).toBe(67);
		expect(pitch[Math.floor(NOTE * 3.5)]).toBe(71);
		expect(pitch[CYCLE + Math.floor(NOTE * 0.5)]).toBe(60); // cycle 2 wraps
		// the 60 -> 64 step lands on the note boundary (within a couple samples)
		const step = pitch.findIndex((v) => v === 64);
		expect(Math.abs(step - NOTE)).toBeLessThanOrEqual(2);
	});

	it("gate opens per note with a 1 ms pre-release gap before each boundary", () => {
		const gate = renderTap(program, si, "gate", 0, CYCLE);
		const GAP = 48; // 1 ms at 48 kHz
		expect(gate[Math.floor(NOTE * 0.5)]).toBe(1); // mid-note: open
		expect(gate[NOTE - Math.floor(GAP / 2)]).toBe(0); // inside the gap: closed
		expect(gate[NOTE - 2 * GAP]).toBe(1); // before the gap: open
		expect(gate[NOTE + 10]).toBe(1); // next note: open again
		// exactly one gap per note: four falling edges per cycle
		let falls = 0;
		for (let i = 1; i < gate.length; i++) {
			if ((gate[i - 1] as number) === 1 && (gate[i] as number) === 0) falls++;
		}
		expect(falls).toBe(4);
	});

	it("trig fires single-sample onsets: 4 per cycle", () => {
		// The clock integrates before emitting, so beat k lands at sample k*NOTE*4 - 1;
		// count in windows nudged 10 samples early to keep whole cycles together.
		const trig = renderTap(program, si, "trig", 0, 2 * CYCLE);
		expect(countOnes(trig, 0, CYCLE - 10)).toBe(4);
		expect(countOnes(trig, CYCLE - 10, 2 * CYCLE - 10)).toBe(4);
	});
});

describe("seq ties", () => {
	const { program, seq: si } = build("c4_e4 g4 b4");
	const STEP = CYCLE / 3;

	it("a tie is legato: continuous gate across the pitch change, one trig", () => {
		const gate = renderTap(program, si, "gate", 0, CYCLE);
		const pitch = renderTap(program, si, "pitch", 0, CYCLE);
		const trig = renderTap(program, si, "trig", 0, CYCLE);
		// pitch still changes 60 -> 64 halfway through the tied step
		expect(pitch[Math.floor(STEP * 0.25)]).toBe(60);
		expect(pitch[Math.floor(STEP * 0.75)]).toBe(64);
		// gate holds straight through the tie boundary
		for (let i = Math.floor(STEP / 2) - 60; i < Math.floor(STEP / 2) + 60; i++) {
			expect(gate[i]).toBe(1);
		}
		// three steps, but the tied continuation does not retrigger
		// (window nudged early: the next cycle's first onset lands at CYCLE - 1)
		expect(countOnes(trig, 0, CYCLE - 10)).toBe(3);
	});
});
