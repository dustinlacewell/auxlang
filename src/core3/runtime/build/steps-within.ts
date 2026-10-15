/**
 * How many steps fit in one block's budget: from `from`, steps run while
 * their estimated costs add up to at most `budget`. At least one step runs
 * when any is left, so a step costlier than the budget still runs alone.
 * Returns the index after the last step to run. Pure.
 */

export interface Costed {
	readonly cost: number;
}

export function stepsWithin(steps: readonly Costed[], from: number, budget: number): number {
	if (from >= steps.length) return from;
	let spent = (steps[from] as Costed).cost;
	let to = from + 1;
	while (to < steps.length && spent + (steps[to] as Costed).cost <= budget) {
		spent += (steps[to] as Costed).cost;
		to++;
	}
	return to;
}
