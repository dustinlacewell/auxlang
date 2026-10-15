/**
 * Estimated audio-thread cost of each build step, in microseconds. The
 * worklet has no reliable clock (`performance.now` may be missing and
 * `Date.now` ticks in whole milliseconds), so the build runner spends a
 * budget of estimates, not of measured time. The coefficients are measured
 * on this machine (src/tests/scratch/build-steps-cost.ts); only their
 * relative sizes matter for packing steps into blocks.
 */

import type { CodeUnit } from "../codegen/code-unit";
import type { NodeRun } from "../node-run";

export const STEP_COSTS = {
	/** Hydrating the program's patch-defined specs, per spec. */
	perPatchSpec: 30,
	/** The output layout, value buffers and feedback starts, per node. */
	layoutPerNode: 4,
	/** Assembling the engine, per node. */
	assemblePerNode: 0.7,
	/** A node: lane states, records, bindings, and two state copies (build/engine-build.ts). */
	nodeBase: 16,
	perLane: 4,
	perStateKilobyte: 0.6,
	/** Planning a node's carry and copying it twice, as a share of its build cost. */
	carryShare: 0.45,
	/** Compiling and instantiating a unit, per source character. */
	compilePerChar: 0.05,
	/** A unit's first shadow call (V8's first-run work, lanes filling their scratch), per character. */
	firstCallPerChar: 0.08,
	/** One later shadow call of a unit: per source character, plus per character and sample. */
	callPerChar: 0.004,
	callPerCharSample: 0.0002,
	/** WASM (wasm-steps.ts): instantiating a module. */
	instantiate: 100,
	/** Touching memory, per 64 KB page. */
	touchPerPage: 20,
	/** Writing the value buffer and the outputs records, per node. */
	valuesPerNode: 0.5,
	/** Writing a lane's start state: per lane, plus per kilobyte of typed arrays and records. */
	laneBase: 2,
	lanePerKilobyte: 0.2,
	/** Making the engine over written memory, per table lane (its empty tables). */
	enginePerTableLane: 2,
	/** Prefilling one table lane's two tables. */
	prefillPerLane: 40,
	/** Binding the carry's views and copying once: per run, plus per kilobyte copied. */
	bindPerRun: 0.5,
	bindPerKilobyte: 0.15,
};

export function nodeBuildCost(run: NodeRun): number {
	const kb = run.states.reduce((sum, s) => sum + stateBytes(s), 0) / 1024;
	return (
		STEP_COSTS.nodeBase + STEP_COSTS.perLane * run.laneCount + STEP_COSTS.perStateKilobyte * kb
	);
}

export function compileCost(unit: CodeUnit): number {
	return STEP_COSTS.compilePerChar * unit.body.length;
}

export function carryCost(nodeCost: number): number {
	return STEP_COSTS.carryShare * nodeCost;
}

export function callCost(unit: CodeUnit, samples: number, first: boolean): number {
	const chars = unit.body.length;
	if (first) return STEP_COSTS.firstCallPerChar * chars;
	return STEP_COSTS.callPerChar * chars + STEP_COSTS.callPerCharSample * chars * samples;
}

function stateBytes(value: unknown): number {
	if (ArrayBuffer.isView(value)) return value.byteLength;
	if (value === null || typeof value !== "object") return 0;
	let sum = 0;
	for (const v of Object.values(value)) sum += stateBytes(v);
	return sum;
}
