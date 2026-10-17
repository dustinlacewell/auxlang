/**
 * One trace's drawn buckets resampled to pixel columns: a
 * column over several buckets takes their min and max, a column between two
 * buckets interpolates them. Each column then stretches to touch the column
 * before it, so a fast edge draws as a joined line, never a gap.
 */

export interface Columns {
	readonly lo: Float32Array;
	readonly hi: Float32Array;
}

/** Fill `into` (both arrays at least `cols` long) with the trace's window from ring bucket `start`, `windowLen` buckets wide. */
export function waveColumns(
	words: Float64Array,
	trace: number,
	start: number,
	windowLen: number,
	cols: number,
	into: Columns,
): void {
	const buckets = (words[1] as number) / 16;
	const base = 2 + trace * buckets * 2;
	const lo = (b: number) => words[base + ((start + b) % buckets) * 2] as number;
	const hi = (b: number) => words[base + ((start + b) % buckets) * 2 + 1] as number;
	if (cols <= windowLen) downsample(lo, hi, windowLen, cols, into);
	else upsample(lo, hi, windowLen, cols, into);
	join(into, cols);
}

function downsample(
	lo: (b: number) => number,
	hi: (b: number) => number,
	windowLen: number,
	cols: number,
	into: Columns,
): void {
	for (let c = 0; c < cols; c++) {
		const from = Math.floor((c * windowLen) / cols);
		const to = Math.max(from + 1, Math.floor(((c + 1) * windowLen) / cols));
		let min = lo(from);
		let max = hi(from);
		for (let b = from + 1; b < to; b++) {
			min = Math.min(min, lo(b));
			max = Math.max(max, hi(b));
		}
		into.lo[c] = min;
		into.hi[c] = max;
	}
}

function upsample(
	lo: (b: number) => number,
	hi: (b: number) => number,
	windowLen: number,
	cols: number,
	into: Columns,
): void {
	const step = (windowLen - 1) / Math.max(1, cols - 1);
	for (let c = 0; c < cols; c++) {
		const p = c * step;
		const b = Math.min(Math.floor(p), windowLen - 2);
		const f = p - b;
		into.lo[c] = lo(b) + (lo(b + 1) - lo(b)) * f;
		into.hi[c] = hi(b) + (hi(b + 1) - hi(b)) * f;
	}
}

/** Each column reaches its left neighbour's range (the neighbour's values before joining). */
function join(into: Columns, cols: number): void {
	let prevLo = into.lo[0] as number;
	let prevHi = into.hi[0] as number;
	for (let c = 1; c < cols; c++) {
		const curLo = into.lo[c] as number;
		const curHi = into.hi[c] as number;
		into.lo[c] = Math.min(curLo, prevHi);
		into.hi[c] = Math.max(curHi, prevLo);
		prevLo = curLo;
		prevHi = curHi;
	}
}
