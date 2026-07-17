/**
 * Poly packing: a stack widens seq to maxWidth lanes on ONE node, and
 * packLanes assigns events greedily so no lane is permanently silent.
 */

import { clock, runProgram, seq } from "@/core3/api";
import { renderTap } from "@/core3/runtime/render";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "./helpers";

const CYCLE = 24000; // one beat at 120 bpm, 48 kHz

function build(pattern: string) {
	const program = runProgram(() => {
		clock(120);
		seq(pattern).tri().out();
	});
	return { program, seq: nodeIndex(program, "seq") };
}

describe("seq poly", () => {
	it("{c4,e4,g4} is width 3 with one chord tone per lane", () => {
		const { program, seq: si } = build("{c4,e4,g4}");
		expect(program.nodes[si]?.width).toBe(3);
		expect(renderTap(program, si, "pitch", 0, 100)[50]).toBe(60);
		expect(renderTap(program, si, "pitch", 1, 100)[50]).toBe(64);
		expect(renderTap(program, si, "pitch", 2, 100)[50]).toBe(67);
	});

	it("{a4,b4} {c5,d5,e5} packs into 3 lanes with no permanently-silent lane", () => {
		const { program, seq: si } = build("{a4,b4} {c5,d5,e5}");
		expect(program.nodes[si]?.width).toBe(3);
		const half = CYCLE / 2;
		// lanes 0/1 play through both halves: a4->c5, b4->d5
		const lane0 = renderTap(program, si, "pitch", 0, CYCLE);
		const lane1 = renderTap(program, si, "pitch", 1, CYCLE);
		expect(lane0[Math.floor(half * 0.5)]).toBe(69);
		expect(lane0[Math.floor(half * 1.5)]).toBe(72);
		expect(lane1[Math.floor(half * 0.5)]).toBe(71);
		expect(lane1[Math.floor(half * 1.5)]).toBe(74);
		// lane 2 rests (holds 0) then sounds e5 in the second half
		const lane2 = renderTap(program, si, "pitch", 2, CYCLE);
		expect(lane2[Math.floor(half * 0.5)]).toBe(0);
		expect(lane2[Math.floor(half * 1.5)]).toBe(76);
		// every lane's gate opens at some point in the cycle
		for (let lane = 0; lane < 3; lane++) {
			const gate = renderTap(program, si, "gate", lane, CYCLE);
			expect(Math.max(...gate)).toBe(1);
		}
	});
});
