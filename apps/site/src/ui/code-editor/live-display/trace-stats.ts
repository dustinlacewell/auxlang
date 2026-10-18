/**
 * Reads one trace of a scope lane's copied `[head, n, ...floats]` buffer
 * (display-frames.ts; scope.js: 8 traces x BUCKETS lo/hi pairs).
 */

const TRACES = 8;

export interface Range {
	readonly min: number;
	readonly max: number;
}

export function bucketsOf(words: Float64Array): number {
	return (words[1] as number) / (TRACES * 2);
}

/** True when every lo and hi of the trace is exactly 0: an unused trace. */
export function traceIsSilent(words: Float64Array, trace: number): boolean {
	const buckets = bucketsOf(words);
	for (let b = 0; b < buckets; b++) {
		const i = 2 + (trace * buckets + b) * 2;
		if ((words[i] as number) !== 0 || (words[i + 1] as number) !== 0) return false;
	}
	return true;
}

/** The trace's min and max over every lane's whole buffer. */
export function traceRange(lanes: readonly Float64Array[], trace: number): Range {
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;
	for (const words of lanes) {
		const buckets = bucketsOf(words);
		for (let b = 0; b < buckets; b++) {
			const i = 2 + (trace * buckets + b) * 2;
			min = Math.min(min, words[i] as number);
			max = Math.max(max, words[i + 1] as number);
		}
	}
	return { min, max };
}
