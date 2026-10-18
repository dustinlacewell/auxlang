/**
 * Every built node's tick specialised for each of its lanes
 * (module/front/types/specialise.ts), as every engine does at build on the
 * main thread: a form the node's config, inputs or sample rate reaches
 * that no engine runs is a loud error here, the same on all of them. The
 * WASM compiler emits each lane from its plan; the interpreter runs the
 * tick itself and keeps only the check. The worklet's build never calls
 * this: its program was compiled before it crossed.
 */

import { specIR } from "../../dsp/front/module/spec-ir";
import type { FunctionPlan } from "../../dsp/front/types/function-plan";
import { specialise } from "../../dsp/front/types/specialise";
import type { ModuleSpec } from "../../types";
import type { NodeRun } from "../node-run";
import { laneInstance } from "./lane-instance";

/** Per node, one plan per lane (a reducer has one lane). */
export type NodePlans = readonly (readonly FunctionPlan[])[];

/** A hand-built spec (a test's own) has no tick text: the interpreter runs its closure as is. */
const NONE: readonly FunctionPlan[] = [];

export function specialiseNodes(
	runs: readonly NodeRun[],
	specs: readonly ModuleSpec[],
	sampleRate: number,
): NodePlans {
	return runs.map((run, i) => {
		const spec = specs[i] as ModuleSpec;
		if (spec.source === undefined) return NONE;
		const ir = specIR(spec);
		return Array.from({ length: run.laneCount }, (_, lane) =>
			specialise(ir, laneInstance(run, lane, sampleRate)),
		);
	});
}
