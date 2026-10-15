/**
 * The build as a list of costed steps (build/build-steps.ts,
 * build/driver-steps.ts) and the runner that spends a budget on them per
 * block (build/steps-within.ts, build/step-runner.ts). Pure.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { buildSteps } from "@/core3/runtime/build/build-steps";
import { driverSteps } from "@/core3/runtime/build/driver-steps";
import { StepRunner } from "@/core3/runtime/build/step-runner";
import { stepsWithin } from "@/core3/runtime/build/steps-within";
import { prepareProgram } from "@/core3/runtime/prepare/prepare-program";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it } from "vitest";

const PROGRAM = evalPatch(`tempo(120)
const s = seq("c3 e3")
s.tri().lpf(900).mul(s.gate.adsr(0.005, 0.1, 0.5, 0.2)).gain(0.3).out()`);

const prepare = (codegen: boolean) =>
	prepareProgram(PROGRAM, getRegistry(), 48000, undefined, {
		codegen,
		build: { budget: 100, rounds: [1, 8] },
	});

describe("buildSteps", () => {
	it("interpreted: specs, layout, one step per node, assemble", () => {
		const kinds = buildSteps(prepare(false)).map((s) => s.k);
		expect(kinds).toEqual(["specs", "layout", ...PROGRAM.nodes.map(() => "node"), "assemble"]);
	});

	it("generated: the driver's unit steps, then a warm call per unit and round, before assemble", () => {
		const prepared = prepare(true);
		const code = prepared.primary;
		if (code === null) throw new Error("no driver code");
		const steps = buildSteps(prepared);
		const driver = steps.filter((s) => s.k === "unit" || s.k === "warm");
		expect(driver).toEqual(driverSteps(code, [1, 8]));
		expect(steps.at(-1)?.k).toBe("assemble");
		const calls = code.units.length - (code.helpers === null ? 0 : 1);
		expect(driver.filter((s) => s.k === "warm").length).toBe(2 * calls);
		expect(steps.every((s) => s.cost >= 0)).toBe(true);
	});

	it("a warm round must fit a group call", () => {
		const code = prepare(true).primary;
		if (code === null) throw new Error("no driver code");
		expect(() => driverSteps(code, [129])).toThrow("from 1 to 128");
		expect(() => driverSteps(code, [0])).toThrow("from 1 to 128");
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
