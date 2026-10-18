/**
 * seq's `out` is a pure function of position (§4.1): at x it holds the value
 * of the lane's most recent note at or before x. Under `rr` and `stable` a
 * lane can be empty for any number of cycles; the value comes from the
 * voices history, so it survives the gap, a backward scan, and a jump.
 */

import { p, runProgram, seq, tempo } from "@/api";
import { createTable } from "@/pattern/table/event-table";
import { fillTable } from "@/pattern/table/fill-table";
import { renderTap } from "@/runtime/render";
import { describe, expect, it } from "vitest";
import { SR, nodeIndex } from "../../testing/bridge-helpers";

const CYCLE = 24000; // one bar at 480 bpm, 48 kHz

describe("a lane holds its last note's value", () => {
	it('rr: lane 0 holds 60 at cycle 2, two cycles after its note (`p`c4`.voices("rr", 4)`)', () => {
		const program = runProgram(() => {
			tempo(480);
			seq(p`c4`.voices("rr", 4)).tri().out();
		});
		const pitch = renderTap(program, nodeIndex(program, "seq"), "out", 0, 4 * CYCLE);
		expect(pitch[100]).toBe(60);
		expect(pitch[2 * CYCLE + 100]).toBe(60);
		expect(pitch[3 * CYCLE + 100]).toBe(60);
	});

	it("the carry is the same read cold, far into the song", () => {
		const table = createTable();
		fillTable(p`c4 d4 e4`.voices("rr", 7).ast, 0, 3, 1000, table);
		// Onset 2999 is the last before cycle 1000; 2999 % 7 = 3, so lane 3 last played e4.
		expect(table.carryValue).toBe(64);
	});

	it("a backward scan into a rest holds the earlier note, not the one it came from", () => {
		// 1.2 (e4, cycle 1) back to 0.8: the rest after c4 in cycle 0.
		const scan = (_s: unknown, _sr: number, t: number) => 1.2 - t * 0.5;
		const program = runProgram(() => {
			seq(p`<c4 e4> ~`.voices("rr", 1), scan).tri().out();
		});
		const pitch = renderTap(program, nodeIndex(program, "seq"), "out", 0, Math.floor(0.8 * SR));
		expect(pitch[10]).toBe(64);
		expect(pitch[Math.floor(0.7 * SR)]).toBe(60);
	});
});
