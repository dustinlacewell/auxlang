/**
 * The block loop around one sample's node code: per sample, flip the value
 * buffers and compute the lambda time exactly as the interpreter does
 * (`(count + k) / sr`); after the block, hand the flipped buffers back to the
 * engine. The sample code reads `cur`, `prv`, `time`, `sr` and `k`.
 */

export function emitBlockLoop(sample: readonly string[]): string[] {
	return [
		"let cur = bufs.cur;",
		"let prv = bufs.prv;",
		"for (let k = 0; k < n; k++) {",
		"const flip = prv;",
		"prv = cur;",
		"cur = flip;",
		"const time = (count + k) / sr;",
		...sample,
		"}",
		"bufs.cur = cur;",
		"bufs.prv = prv;",
	];
}
