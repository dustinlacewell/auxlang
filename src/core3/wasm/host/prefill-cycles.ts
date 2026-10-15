/**
 * The cycle each table lane of a new engine is prefilled for (`cur`, and
 * the one after into `next`), so the swap's first ticks find their tables:
 *
 * - a fresh start: cycle 0, where a clocked position starts;
 * - a hand-over: the cycle its source lane's current table holds
 *   (carry/table-sources.ts); a lane with no source, or a source with no
 *   table yet, takes the first source cycle found, since lanes on one clock
 *   share it; NaN when there is none (no prefill: the tick's miss path
 *   fills it).
 *
 * A wrong cycle costs a fill later, never output: a table is a pure
 * function of its cycle. Pure, given `cycleOf`.
 */

export function prefillCycles(
	lanes: number,
	sources: Int32Array | null,
	cycleOf: (node: number, lane: number) => number,
): Float64Array {
	const cycles = new Float64Array(lanes);
	if (sources === null) return cycles;
	for (let k = 0; k < lanes; k++) {
		const node = sources[2 * k] as number;
		cycles[k] = node < 0 ? Number.NaN : cycleOf(node, sources[2 * k + 1] as number);
	}
	const shared = cycles.find(Number.isFinite) ?? Number.NaN;
	for (let k = 0; k < lanes; k++) if (!Number.isFinite(cycles[k])) cycles[k] = shared;
	return cycles;
}
