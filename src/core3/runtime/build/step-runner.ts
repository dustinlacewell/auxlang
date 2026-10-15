/**
 * Runs a list of costed steps a budget at a time (steps-within.ts): the
 * worklet calls `advance` once per block, so a build spreads over blocks
 * while the old engine plays. `finish` runs the rest at once (offline).
 */

import { type Costed, stepsWithin } from "./steps-within";

export class StepRunner<S extends Costed> {
	private next = 0;

	constructor(
		private readonly steps: readonly S[],
		private readonly execute: (step: S) => void,
	) {}

	get done(): boolean {
		return this.next >= this.steps.length;
	}

	/** Run the steps whose estimated costs fit `budget` (at least one); true when none are left. */
	advance(budget: number): boolean {
		const to = stepsWithin(this.steps, this.next, budget);
		for (; this.next < to; this.next++) this.execute(this.steps[this.next] as S);
		return this.done;
	}

	finish(): void {
		this.advance(Number.POSITIVE_INFINITY);
	}
}
