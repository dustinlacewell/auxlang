/**
 * seq reads a pattern at any position signal (MANIFESTO §4.1). trig fires
 * once per note entered, whatever the direction or distance; a clocked seq
 * dips its gate before the change so gate and trig rise together; an
 * unclocked seq dips for 1 ms from the change. Chaining a position into seq
 * binds it; the old trigger-domain API is gone from the user scope.
 */

import { buildUserScope, clock, factory, runProgram, seq } from "@/core3/api";
import { renderTap } from "@/core3/runtime/render";
import { describe, expect, it } from "vitest";
import { SR, countOnes, nodeIndex } from "./helpers";

const NOTES = "c4 e4 g4 b4";
const DIP = 48; // 1 ms at 48 kHz

function taps(build: () => void, samples: number) {
	const program = runProgram(build);
	const si = nodeIndex(program, "seq");
	return {
		program,
		out: renderTap(program, si, "out", 0, samples),
		gate: renderTap(program, si, "gate", 0, samples),
		trig: renderTap(program, si, "trig", 0, samples),
	};
}

const onesAt = (buf: Float32Array) => [...buf.keys()].filter((i) => buf[i] === 1);

/** A backwards scan from the end of cycle 0. */
const scan = (_s: unknown, _sr: number, t: number) => 0.999 - t * 0.25;

/** Ten 0.1 s holds cycling through 0.1, 0.85, 0.6, 0.35: every hold is a new note. */
const jumps = (_s: unknown, _sr: number, t: number) => ((Math.floor(t * 10) * 7) % 4) / 4 + 0.1;

describe("seq at a position signal", () => {
	it("a backwards scan fires one trig per note entered", () => {
		// 0.999 → 0.024 over 3.9 s: b4, g4, e4, c4, each once.
		const { out, trig } = taps(() => seq(NOTES, scan).tri().out(), Math.floor(3.9 * SR));
		expect(countOnes(trig)).toBe(4);
		expect(onesAt(trig).map((i) => out[i])).toEqual([71, 67, 64, 60]);
	});

	it("random jumps fire one trig per jump to a different note", () => {
		const { trig } = taps(() => seq(NOTES, jumps).tri().out(), SR);
		expect(countOnes(trig)).toBe(10);
	});

	it("unclocked: a trig into a high gate dips it for 1 ms from the change", () => {
		const { gate, trig } = taps(() => seq(NOTES, jumps).tri().out(), SR);
		const changes = onesAt(trig).slice(1); // the first trig enters from nothing
		expect(changes.length).toBe(9);
		for (const i of changes) {
			expect(gate.subarray(i, i + DIP).every((v) => v === 0)).toBe(true);
			expect(gate[i + DIP]).toBe(1);
		}
	});

	// Two beats at 120 bpm, minus the last samples where the third cycle starts.
	const TWO_CYCLES = SR - 10;

	it("clocked: gate and trig rise on the same sample", () => {
		const { gate, trig } = taps(() => {
			clock(120);
			seq(NOTES).tri().out();
		}, TWO_CYCLES);
		const rises = [...gate.keys()].filter((i) => i > 0 && gate[i - 1] === 0 && gate[i] === 1);
		expect(onesAt(trig).slice(1)).toEqual(rises);
		expect(rises.length).toBe(7); // two cycles of four notes, minus the first onset
	});

	it("chaining a clock into seq binds its position", () => {
		const { program, trig } = taps(() => {
			clock(120).seq(NOTES).tri().out();
		}, TWO_CYCLES);
		expect(program.nodes[nodeIndex(program, "seq")]?.config.clocked).toBe(1);
		expect(countOnes(trig)).toBe(8);
	});

	it("an explicit non-clock position is unclocked", () => {
		const { program } = taps(() => {
			const position = factory("lfo")(0.1, 0, 4);
			seq(NOTES, position).tri().out();
		}, 10);
		expect(program.nodes[nodeIndex(program, "seq")]?.config.clocked).toBe(0);
	});
});

describe("the old bridge API is gone", () => {
	it("patstep and patsig are not in the user scope", () => {
		const scope = buildUserScope();
		expect(scope).not.toHaveProperty("patstep");
		expect(scope).not.toHaveProperty("patsig");
		expect(scope).toHaveProperty("seq");
	});
});
