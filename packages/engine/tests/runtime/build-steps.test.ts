/**
 * The build as a list of costed steps (build/build-steps.ts) and the runner
 * that spends a budget on them per block (build/steps-within.ts,
 * build/step-runner.ts). Pure.
 */

import "@/library/all";

import { getRegistry } from "@/dsp/define";
import { buildSteps } from "@/runtime/build/build-steps";
import { StepRunner } from "@/runtime/build/step-runner";
import { stepsWithin } from "@/runtime/build/steps-within";
import { prepareProgram } from "@/runtime/prepare/prepare-program";
import { evalPatch } from "@/eval-patch";
import { describe, expect, it } from "vitest";

const PROGRAM = evalPatch(`tempo(120)
const s = seq("c3 e3")
s.tri().lpf(900).mul(s.gate.adsr(0.005, 0.1, 0.5, 0.2)).gain(0.3).out()`);

describe("buildSteps", () => {
	it("specs, layout, one step per node, assemble", () => {
		const steps = buildSteps(prepareProgram(PROGRAM, getRegistry(), 48000, undefined), false);
		expect(steps.map((s) => s.k)).toEqual([
			"specs",
			"layout",
			...PROGRAM.nodes.map(() => "node"),
			"assemble",
		]);
		expect(steps.every((s) => s.cost >= 0)).toBe(true);
	});
});

describe("stepsWithin", () => {
	const steps = [3, 3, 5, 1, 9].map((cost) => ({ cost }));

	it("takes steps while their costs fit the budget", () => {
		expect(stepsWithin(steps, 0, 6)).toBe(2);
		expect(stepsWithin(steps, 2, 6)).toBe(4);
	});

	it("always takes one step, even over the budget", () => {
		expect(stepsWithin(steps, 4, 1)).toBe(5);
	});

	it("takes nothing past the end", () => {
		expect(stepsWithin(steps, 5, 100)).toBe(5);
	});
});

describe("StepRunner", () => {
	it("runs the steps in order, a budget at a time, and reports done", () => {
		const ran: number[] = [];
		const runner = new StepRunner(
			[3, 3, 5, 1].map((cost, i) => ({ cost, i })),
			(s) => ran.push(s.i),
		);
		expect(runner.advance(6)).toBe(false);
		expect(ran).toEqual([0, 1]);
		runner.finish();
		expect(ran).toEqual([0, 1, 2, 3]);
		expect(runner.done).toBe(true);
	});
});
