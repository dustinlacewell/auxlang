/**
 * Generated driver code: the program split into groups (group/plan-groups:
 * strongly connected components, merged in run order up to the group
 * budget), one code unit per group, plus a taps unit and, when ticks paste,
 * a helpers unit. Each group runs the whole block before the next; slots
 * crossing groups pass through block buffers (group/block-slots). Feedback
 * stays inside one component, so this is exactly the per-sample walk.
 *
 * Phase 1 keeps every node at a call site; phase 2 pastes ticks inline
 * (paste/) while a group fits V8's optimizable size (PASTE_BUDGET). Both use
 * the same groups. The result is plain data — source strings and binding
 * paths — so it can be generated on the main thread and compiled in the
 * worklet one unit at a time (build/).
 */

import type { DriverPlan } from "../driver";
import { type BindingPath, pathIndex } from "./binding-path";
import type { CodeUnit } from "./code-unit";
import { DriverScope } from "./driver-scope";
import { blockSlots } from "./group/block-slots";
import { emitGroup } from "./group/emit-group";
import { emitGroupTaps } from "./group/emit-group-taps";
import { nodeDeps } from "./group/node-graph";
import { planGroups } from "./group/plan-groups";
import { NameTable } from "./name-table";
import { choosePasted } from "./paste/choose-pasted";
import { type NodeCost, nodeCost } from "./paste/node-cost";
import { ParseCache } from "./paste/parse-cache";
import { PASTE_BUDGET } from "./paste/paste-budget";
import { Paster } from "./paste/paster";

export interface DriverCode {
	/** The helpers unit (if any) first, then the groups in run order, then the taps. */
	readonly units: readonly CodeUnit[];
	readonly helpers: string | null;
	readonly groups: readonly string[];
	readonly taps: string;
	/** Every unit parameter that is a bound value or a helper. */
	readonly paths: Readonly<Record<string, BindingPath>>;
}

export interface GroupedOptions {
	/** Paste ticks inline (phase 2), or keep every node at a call site (phase 1). */
	readonly paste: boolean;
	/** The group size budget (group/group-budget.ts). */
	readonly budget: number;
}

export function emitGroupedCode(plan: DriverPlan, options: GroupedOptions): DriverCode {
	const scope = new DriverScope();
	const names = new NameTable();
	const trees = new ParseCache();
	const costs = plan.runs.map((run) => nodeCost(run, trees));
	const groups = planGroups(
		{ deps: nodeDeps(plan.runs), cost: costs.map((c) => c.pasted ?? c.call) },
		options.budget,
	);
	const block = blockSlots(plan.runs, groups, [...plan.tapsL, ...plan.tapsR]);
	const paster = new Paster(plan.runs, scope, trees, names);
	const env = { runs: plan.runs, scope, paster, block, buffer: scope.bind(names.fresh(), block.buffer) };
	const globals = scope.since(0).map((b) => b.name);

	const emitted = groups.map((members, g) => {
		const name = names.fresh();
		const mark = scope.mark();
		const pasted = options.paste ? pastedIn(members, costs) : new Set<number>();
		const body = emitGroup(name, members, pasted, env);
		return { name, body, bound: scope.since(mark).map((b) => b.name), g };
	});
	const helperNames = paster.helperNames();
	const helpers = helperNames.length === 0 ? null : paster.helperUnit(names.fresh());
	const taps = names.fresh();
	const units: CodeUnit[] = [
		...(helpers === null ? [] : [helpers]),
		...emitted.map((e) => ({ name: e.name, params: [...globals, ...helperNames, ...e.bound], body: e.body })),
		{ name: taps, params: [env.buffer], body: emitGroupTaps(taps, plan.tapsL, plan.tapsR, block, env.buffer) },
	];
	return {
		units,
		helpers: helpers?.name ?? null,
		groups: emitted.map((e) => e.name),
		taps,
		paths: bindingPaths(scope, plan, block.buffer, helperNames),
	};
}

/** The members that paste within V8's optimizable function size. */
function pastedIn(members: readonly number[], costs: readonly NodeCost[]): Set<number> {
	const chosen = choosePasted(
		members.map((i) => costs[i] as NodeCost),
		PASTE_BUDGET,
	);
	return new Set([...chosen].map((j) => members[j] as number));
}

function bindingPaths(
	scope: DriverScope,
	plan: DriverPlan,
	buffer: Float64Array,
	helperNames: readonly string[],
): Record<string, BindingPath> {
	const index = pathIndex(plan.runs);
	index.set(buffer, { k: "block", length: buffer.length });
	const paths: Record<string, BindingPath> = {};
	for (const { name, value } of scope.since(0)) {
		const path = index.get(value);
		if (path === undefined) throw new Error(`codegen: bound value '${name}' has no binding path`);
		paths[name] = path;
	}
	helperNames.forEach((name, i) => {
		paths[name] = { k: "helper", index: i };
	});
	return paths;
}
