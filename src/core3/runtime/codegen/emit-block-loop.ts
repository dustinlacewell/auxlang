/**
 * A block function body: load value slots and node state into locals, run
 * the sample loop, store everything back. Per sample: shift the z-read slots
 * (value-slots.ts), compute the lambda time exactly as the interpreter does
 * (`(count + k) / sr`), run every node in order, then the `sampleEnd` lines
 * (tap sums, or a group's block-buffer writes). `start` runs once after the
 * loads. The node code reads `time`, `sr` and `k`.
 */

import type { NodeCode } from "./node-code";
import { type ValueSlots, emitPrevShift, emitSlotLoads, emitSlotStores } from "./value-slots";

export function emitBlockLoop(
	slots: ValueSlots,
	nodes: readonly NodeCode[],
	sampleEnd: readonly string[],
	start: readonly string[] = [],
): string[] {
	return [
		...emitSlotLoads(slots),
		...nodes.flatMap((node) => node.before),
		...start,
		"for (let k = 0; k < n; k++) {",
		...emitPrevShift(slots),
		"const time = (count + k) / sr;",
		...nodes.flatMap((node) => node.sample),
		...sampleEnd,
		"}",
		...nodes.flatMap((node) => node.after),
		...emitSlotStores(slots),
	];
}
