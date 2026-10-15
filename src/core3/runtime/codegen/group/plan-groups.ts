/**
 * Split a program into groups for the grouped driver: find the strongly
 * connected components of its node graph (z-reads included, so every
 * feedback loop sits inside one component), order them so each runs after
 * what it reads, then merge consecutive components while the group's cost
 * stays within `budget`. A component larger than the budget is a group of
 * its own. Each group lists node indices in program order. Pure.
 */

import { orderComponents } from "./order-components";
import { strongComponents } from "./strong-components";

export interface NodeGraph {
	/** deps[i]: the nodes node i reads from ("n" or "z"). */
	readonly deps: readonly (readonly number[])[];
	/** cost[i]: node i's estimated size in the generated code. */
	readonly cost: readonly number[];
}

export function planGroups(graph: NodeGraph, budget: number): number[][] {
	const components = orderComponents(graph.deps, strongComponents(graph.deps));
	const groups: number[][] = [];
	let current: number[] = [];
	let size = 0;
	for (const members of components) {
		const cost = members.reduce((sum, v) => sum + (graph.cost[v] as number), 0);
		if (current.length > 0 && size + cost > budget) {
			groups.push(current);
			current = [];
			size = 0;
		}
		current.push(...members);
		size += cost;
	}
	if (current.length > 0) groups.push(current);
	return groups.map((g) => g.sort((a, b) => a - b));
}
