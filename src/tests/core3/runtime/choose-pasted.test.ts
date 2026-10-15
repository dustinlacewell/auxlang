/**
 * The paste budget choice, without an engine: nodes paste in order while the
 * driver's estimated size fits; one that does not fit is skipped; nodes with
 * no checked source never paste. Also pins that a node's cost scales with
 * its lanes and its tick's size.
 */

import { choosePasted } from "@/core3/runtime/codegen/paste/choose-pasted";
import { nodeCost } from "@/core3/runtime/codegen/paste/node-cost";
import { ParseCache } from "@/core3/runtime/codegen/paste/parse-cache";
import type { NodeRun } from "@/core3/runtime/node-run";
import { describe, expect, it } from "vitest";

const cost = (pasted: number | null, call: number) => ({ pasted, call });

describe("choosePasted", () => {
	it("pastes everything that fits", () => {
		expect([...choosePasted([cost(30, 10), cost(30, 10)], 100)]).toEqual([0, 1]);
	});

	it("pastes in node order until the budget, skipping a node that does not fit", () => {
		// Start 30 (all calls). Node 0: 30-10+50 = 70. Node 1: 70-10+50 = 110 > 100, skip.
		// Node 2: 70-10+20 = 80.
		const costs = [cost(50, 10), cost(50, 10), cost(20, 10)];
		expect([...choosePasted(costs, 100)]).toEqual([0, 2]);
	});

	it("never pastes a node without checked source", () => {
		expect([...choosePasted([cost(null, 10), cost(5, 10)], 1000)]).toEqual([1]);
	});

	it("a zero budget pastes nothing", () => {
		expect(choosePasted([cost(1, 10)], 0).size).toBe(0);
	});

	it("a node costs more pasted with more lanes and a bigger tick", () => {
		const run = (tick: string, laneCount: number) =>
			({
				source: { tick, helpers: {} },
				laneCount,
				outPorts: ["out"],
				gathers: null,
				bindings: [{ names: ["in"] }],
			}) as unknown as NodeRun;
		const trees = new ParseCache();
		const small = nodeCost(run("(s, i, o) => { o.out = i.in; }", 1), trees);
		const wide = nodeCost(run("(s, i, o) => { o.out = i.in; }", 4), trees);
		const big = nodeCost(run("(s, i, o) => { o.out = i.in * 2 + Math.sin(i.in) - 1; }", 1), trees);
		expect(wide.pasted).toBe((small.pasted as number) * 4);
		expect(wide.call).toBe(small.call * 4);
		expect(big.pasted as number).toBeGreaterThan(small.pasted as number);
		expect(big.call).toBe(small.call);
	});
});
