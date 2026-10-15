/**
 * Build-time step counts for `.steps()`: for each layer, how many steps each
 * cycle of the child's period holds. Counts never depend on the seed (event
 * times and, without `compact`, kinds are fixed by structure), so one query
 * per cycle at seed 0 is exact for every seed.
 */

import type { Pat, StepLayer } from "./ast";
import { query } from "./query";
import { r } from "./rational";
import type { LaneRange } from "./step-layers";
import { stepOnsets } from "./step-onsets";

export function stepCounts(child: Pat, layers: readonly LaneRange[], cycles: number): StepLayer[] {
	const counts = layers.map(() => [] as number[]);
	for (let c = 0; c < cycles; c++) {
		const evs = query(child, { begin: r(c), end: r(c + 1) }, { seed: 0, path: 0 });
		layers.forEach((layer, i) => counts[i]?.push(stepOnsets(evs, layer).length));
	}
	return layers.map((layer, i) => ({ lo: layer.lo, hi: layer.hi, counts: counts[i] as number[] }));
}
