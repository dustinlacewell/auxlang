/**
 * The steps that build an engine from a prepared program
 * (prepare/prepare-program.ts), in order, each with its estimated cost
 * (step-costs.ts): hydrate the patch's specs, lay out the value buffers,
 * build each node, plan each paired node's carry, build the primary driver
 * (driver-steps.ts), assemble.
 * engine-build.ts executes them. Pure.
 */

import type { PreparedProgram } from "../prepare/prepare-program";
import { type DriverStep, driverSteps } from "./driver-steps";
import { STEP_COSTS, carryCost } from "./step-costs";

export type BuildStep =
	| { readonly k: "specs" | "layout" | "assemble"; readonly cost: number }
	| { readonly k: "node" | "carry"; readonly node: number; readonly cost: number }
	| DriverStep;

export function buildSteps(prepared: PreparedProgram): BuildStep[] {
	const nodes = prepared.program.nodes.length;
	const specs = prepared.program.specs?.length ?? 0;
	const rounds = prepared.build.rounds;
	return [
		{ k: "specs", cost: STEP_COSTS.perPatchSpec * specs },
		{ k: "layout", cost: STEP_COSTS.layoutPerNode * nodes },
		...prepared.nodeCosts.map((cost, node) => ({ k: "node" as const, node, cost })),
		...prepared.paired.map(([node]) => ({
			k: "carry" as const,
			node,
			cost: carryCost(prepared.nodeCosts[node] ?? 0),
		})),
		...(prepared.primary === null ? [] : driverSteps(prepared.primary, rounds)),
		{ k: "assemble", cost: STEP_COSTS.assemblePerNode * nodes },
	];
}
