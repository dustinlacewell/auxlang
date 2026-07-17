/**
 * Determinism across the whole bridge: a degrade (`?`) pattern renders
 * bit-identically run-to-run for one seed, and differently for another seed.
 */

import { clock, runProgram, seq } from "@/core3/api";
import { render, renderTap } from "@/core3/runtime/render";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "./helpers";

const build = (seed: number) =>
	runProgram(
		() => {
			clock(120);
			const s = seq("c4? d4? e4? f4? g4? a4? b4? c5?");
			s.tri().mul(s.gate).out();
		},
		{ seed },
	);

describe("bridge determinism", () => {
	it("two renders of the same degrade program are bit-identical", () => {
		const program = build(1);
		const a = render(program, 1);
		const b = render(program, 1);
		expect(a.l).toEqual(b.l);
		expect(a.r).toEqual(b.r);
	});

	it("a different seed produces a different event stream", () => {
		const a = build(1);
		const b = build(2);
		const gateA = renderTap(a, nodeIndex(a, "seq"), "gate", 0, 96000);
		const gateB = renderTap(b, nodeIndex(b, "seq"), "gate", 0, 96000);
		expect(gateA).not.toEqual(gateB);
	});
});
