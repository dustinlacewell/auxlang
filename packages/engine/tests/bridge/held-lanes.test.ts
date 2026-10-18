/**
 * A held note keeps its lane across cycle edges (§3.1, §3.5). In
 * `<~ e4>` stacked with `c4.slow(2)`, c4 holds for two cycles in lane 1 while
 * e4 enters lane 0 at the cycle 1 edge. Lanes come from structure, so the
 * query window cannot move c4: no restart at the edge, and e4 gets its own
 * trig and gate rise.
 */

import { p, runProgram, seq, tempo } from "@/api";
import { laneOf } from "@/pattern/event";
import { renderTap } from "@/runtime/render";
import { describe, expect, it } from "vitest";
import { queryCycles } from "../pattern/helpers";
import { countOnes, nodeIndex } from "../../testing/bridge-helpers";

const CYCLE = 24000; // one bar at 480 bpm, 48 kHz
// Two cycles, minus the last samples where c4's next onset (cycle 2) fires.
const SPAN = 2 * CYCLE - 4;

const held = () => p`<~ e4>`.stack(p`c4`.slow(2));

function rises(gate: Float32Array): number[] {
	const at: number[] = [];
	for (let i = 1; i < gate.length; i++) if (gate[i - 1] === 0 && gate[i] === 1) at.push(i);
	return at;
}

describe("held notes keep their lane", () => {
	const program = runProgram(() => {
		tempo(480);
		seq(held()).tri().out();
	});
	const si = nodeIndex(program, "seq");

	it("c4 holds lane 1 for both cycles: one trig, no gate rise at the edge", () => {
		expect(program.nodes[si]?.width).toBe(2);
		const pitch = renderTap(program, si, "out", 1, SPAN);
		const gate = renderTap(program, si, "gate", 1, SPAN);
		const trig = renderTap(program, si, "trig", 1, SPAN);
		expect(pitch[100]).toBe(60);
		expect(pitch[CYCLE + 100]).toBe(60);
		expect(countOnes(trig)).toBe(1);
		expect(gate[CYCLE - 1]).toBe(1);
		expect(gate[CYCLE]).toBe(1);
		expect(rises(gate)).toEqual([]);
	});

	it("e4 enters lane 0 at the edge with its own trig and gate rise", () => {
		const pitch = renderTap(program, si, "out", 0, SPAN);
		const gate = renderTap(program, si, "gate", 0, SPAN);
		const trig = renderTap(program, si, "trig", 0, SPAN);
		expect(pitch[CYCLE + 100]).toBe(64);
		expect(countOnes(trig)).toBe(1);
		expect(Math.abs(trig.indexOf(1) - CYCLE)).toBeLessThanOrEqual(2);
		expect(rises(gate).map((i) => Math.abs(i - CYCLE) <= 2)).toEqual([true]);
	});

	it("lane assignment does not depend on where the query starts", () => {
		const c4Lanes = (from: number, to: number) =>
			queryCycles(held().ast, from, to)
				.filter((ev) => ev.value === 60)
				.map(laneOf);
		expect(c4Lanes(0, 2)).toEqual([1, 1]);
		expect(c4Lanes(1, 2)).toEqual([1]);
		expect(c4Lanes(1.5, 2)).toEqual([1]);
	});
});
