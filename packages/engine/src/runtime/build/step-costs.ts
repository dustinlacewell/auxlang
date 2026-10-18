/**
 * Estimated audio-thread cost of each build step, in microseconds. The
 * worklet has no reliable clock (`performance.now` may be missing and
 * `Date.now` ticks in whole milliseconds), so the build runner spends a
 * budget of estimates, not of measured time. The coefficients are measured
 * on this machine, on warm swaps of the worklet's WASM build
 * (src/tests/scratch/wasm-steps-cost.ts, coastline, representative and wide
 * patches): each step kind's estimate is near its measured time, so a
 * block's budget is near the time it spends.
 */

import type { NodeRun } from "../node-run";

export const STEP_COSTS = {
	/** Hydrating the program's patch-defined specs, per spec. */
	perPatchSpec: 30,
	/** The output layout, value buffers and feedback starts, per node. */
	layoutPerNode: 2,
	/** Assembling the engine, per node. */
	assemblePerNode: 0.15,
	/** A node: lane states, records and bindings (build/engine-build.ts). */
	nodeBase: 4,
	perLane: 1,
	perStateKilobyte: 0.16,
	/** Planning a node's carry and copying it, as a share of its build cost. */
	carryShare: 0.45,
	/** WASM (wasm-steps.ts): instantiating a module. */
	instantiate: 85,
	/** Touching memory, per 64 KB page. */
	touchPerPage: 7,
	/** Writing the value buffer and the outputs records, per node. */
	valuesPerNode: 0.6,
	/** Writing a lane's start state: per lane, plus per kilobyte of typed arrays and records. */
	laneBase: 0.85,
	lanePerKilobyte: 0.12,
	/** Making the engine over written memory: once, plus per table lane (its empty tables). */
	engineBase: 30,
	enginePerTableLane: 1.1,
	/** Prefilling one table lane's two tables. */
	prefillPerLane: 3.6,
	/** Binding the carry's views and copying once: per run, plus per kilobyte copied. */
	bindPerRun: 0.2,
	bindPerKilobyte: 0.065,
};

export function nodeBuildCost(run: NodeRun): number {
	const kb = run.states.reduce((sum, s) => sum + stateBytes(s), 0) / 1024;
	return (
		STEP_COSTS.nodeBase + STEP_COSTS.perLane * run.laneCount + STEP_COSTS.perStateKilobyte * kb
	);
}

export function carryCost(nodeCost: number): number {
	return STEP_COSTS.carryShare * nodeCost;
}

function stateBytes(value: unknown): number {
	if (ArrayBuffer.isView(value)) return value.byteLength;
	if (value === null || typeof value !== "object") return 0;
	let sum = 0;
	for (const v of Object.values(value)) sum += stateBytes(v);
	return sum;
}
