/**
 * The grouped driver's seams. The planner (pure): components, their order,
 * merging up to the budget. The driver: with every component in its own
 * group, slots cross groups through block buffers as "n" and "z" reads, and
 * still match the interpreter bit for bit — including a "z" edge between
 * groups and blocks longer than BLOCK_MAX.
 */

import "@/core3/modules/all";

import { planGroups } from "@/core3/runtime/codegen/group/plan-groups";
import type { Program } from "@/core3/types";
import { EXAMPLES as SITE } from "@/ui/core3-editor/examples";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it } from "vitest";
import { INTERPRETER, SR, expectSameRun, run } from "./codegen-harness";

const ungrouped = (deps: number[][]) => ({ deps, cost: deps.map(() => 1) });

describe("planGroups", () => {
	it("keeps a feedback loop in one group, whatever the budget", () => {
		// 0 → 1 → 2 → 1 (z), 2 → 3
		const groups = planGroups(ungrouped([[], [0, 2], [1], [2]]), 0);
		expect(groups).toEqual([[0], [1, 2], [3]]);
	});

	it("runs a component after the one it reads through a forward z edge", () => {
		// node 0 reads node 2 (z) with no path back: 2 must run first.
		const groups = planGroups(ungrouped([[2], [], [1]]), 0);
		expect(groups).toEqual([[1], [2], [0]]);
	});

	it("merges consecutive components up to the budget, members in program order", () => {
		const graph = { deps: [[], [0], [1], [2]], cost: [2, 2, 2, 2] };
		expect(planGroups(graph, 4)).toEqual([
			[0, 1],
			[2, 3],
		]);
		expect(planGroups(graph, 100)).toEqual([[0, 1, 2, 3]]);
	});

	it("puts a component larger than the budget in a group of its own", () => {
		const graph = { deps: [[], [0, 2], [1], [2]], cost: [1, 10, 10, 1] };
		expect(planGroups(graph, 5)).toEqual([[0], [1, 2], [3]]);
	});

	it("prefers program order among independent components", () => {
		expect(planGroups(ungrouped([[], [], []]), 0)).toEqual([[0], [1], [2]]);
	});
});

/** sin → mul reading it through "z" (no loop) → out. */
const FORWARD_Z: Program = {
	nodes: [
		{ id: "a", module: "sin", width: 1, lanes: [{ pitch: { k: "c", v: 60 } }], config: {} },
		{
			id: "b",
			module: "mul",
			width: 1,
			lanes: [{ in: { k: "z", node: 0, port: "out", lane: 0 }, by: { k: "c", v: 0.5 } }],
			config: {},
		},
		{
			id: "c",
			module: "out",
			width: 1,
			lanes: [{ in: { k: "n", node: 1, port: "out", lane: 0 } }],
			config: {},
		},
	],
	outs: [2],
	seed: 1,
};

const ONE_PER_GROUP = { codegen: true, paste: true, groupBudget: 0 } as const;

describe("grouped driver with every component in its own group", () => {
	it("a z edge between groups", () => {
		const ref = run(FORWARD_Z, INTERPRETER, SR / 8);
		expectSameRun(ref, run(FORWARD_Z, ONE_PER_GROUP, SR / 8), "one per group");
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.1);
	});

	for (const example of SITE.slice(0, 9)) {
		it(`site: ${example.name}`, () => {
			const program = evalPatch(example.source);
			const ref = run(program, INTERPRETER, SR / 2);
			expectSameRun(ref, run(program, ONE_PER_GROUP, SR / 2), "one per group");
		}, 20_000);
	}
});
