/**
 * Phase-2 codegen driver: the program split into groups (group/plan-groups:
 * strongly connected components, merged in run order up to GROUP_BUDGET),
 * one generated function per group. Each group runs the whole block before
 * the next, with its ticks pasted inline and its state in locals (paste/);
 * slots crossing groups pass through block buffers (group/block-slots).
 * Feedback stays inside one component, so this is exactly the per-sample
 * walk. A group pastes nodes only while it fits V8's optimizable size
 * (PASTE_BUDGET); the rest, and the exempt modules, keep call sites.
 */

import type { Driver, DriverPlan } from "../driver";
import { DriverScope } from "./driver-scope";
import { BLOCK_MAX, blockSlots } from "./group/block-slots";
import { emitGroup } from "./group/emit-group";
import { emitGroupTaps } from "./group/emit-group-taps";
import { GROUP_BUDGET } from "./group/group-budget";
import { nodeDeps } from "./group/node-graph";
import { planGroups } from "./group/plan-groups";
import { NameTable } from "./name-table";
import { choosePasted } from "./paste/choose-pasted";
import { type NodeCost, nodeCost } from "./paste/node-cost";
import { ParseCache } from "./paste/parse-cache";
import { PASTE_BUDGET } from "./paste/paste-budget";
import { Paster } from "./paste/paster";

export function compileGrouped(plan: DriverPlan, budget = GROUP_BUDGET): Driver {
	const scope = new DriverScope();
	const names = new NameTable();
	const trees = new ParseCache();
	const costs = plan.runs.map((run) => nodeCost(run, trees));
	const groups = planGroups(
		{ deps: nodeDeps(plan.runs), cost: costs.map((c) => c.pasted ?? c.call) },
		budget,
	);
	const block = blockSlots(plan.runs, groups, [...plan.tapsL, ...plan.tapsR]);
	const env = {
		runs: plan.runs,
		scope,
		paster: new Paster(plan.runs, scope, trees, names),
		block,
		buffer: scope.bind(names.fresh(), block.buffer),
	};
	const groupNames = groups.map(() => names.fresh());
	const functions = groups.flatMap((members, g) =>
		emitGroup(groupNames[g] as string, members, pastedIn(members, costs), env),
	);
	const taps = names.fresh();
	const prelude = [
		env.paster.preludeSource(),
		...functions,
		...emitGroupTaps(taps, plan.tapsL, plan.tapsR, block, env.buffer),
	];
	return scope.instantiate(prelude.join("\n"), emitChunks(groupNames, taps).join("\n"));
}

/** The members that paste within V8's optimizable function size. */
function pastedIn(members: readonly number[], costs: readonly NodeCost[]): Set<number> {
	const chosen = choosePasted(
		members.map((i) => costs[i] as NodeCost),
		PASTE_BUDGET,
	);
	return new Set([...chosen].map((j) => members[j] as number));
}

/** The driver: per chunk of at most BLOCK_MAX samples, every group in order, then the taps. */
function emitChunks(groups: readonly string[], taps: string): string[] {
	return [
		`for (let at = 0; at < n; at += ${BLOCK_MAX}) {`,
		`const m = n - at < ${BLOCK_MAX} ? n - at : ${BLOCK_MAX};`,
		...groups.map((g) => `${g}(bufs, m, count + at, sr);`),
		`${taps}(outL, outR, offset + at, m);`,
		"}",
	];
}
