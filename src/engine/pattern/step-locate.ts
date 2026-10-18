/**
 * Where step `n` of a stepped layer comes from: the child's cycle and the
 * step's index among that cycle's steps. `counts[k]` is the step count of
 * cycle k of the period; the period repeats, so step n of a period of T
 * steps is step n mod T of the first. Null when the layer has no steps.
 */

export interface StepSource {
	readonly cycle: number;
	readonly index: number;
}

export function locateStep(counts: readonly number[], n: number): StepSource | null {
	const total = counts.reduce((a, b) => a + b, 0);
	if (total === 0) return null;
	const block = Math.floor(n / total);
	let within = n - block * total;
	for (let k = 0; k < counts.length; k++) {
		const count = counts[k] as number;
		if (within < count) return { cycle: block * counts.length + k, index: within };
		within -= count;
	}
	return null;
}
