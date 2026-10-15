/**
 * Block buffers for the slots that cross groups. A group runs the whole
 * block before the next group starts, so a slot read by another group (or
 * by the tap sums) is written to a block region: index 0 holds its value
 * from the sample before the block, index k + 1 its value at sample k. A
 * reader takes "n" (this sample) from k + 1 and "z" (the previous sample)
 * from k. Regions are BLOCK_MAX + 1 long; the driver splits longer blocks.
 */

import type { NodeRun } from "../../node-run";
import { outputSlots } from "../value-slots";
import { readSlots } from "./node-graph";

/** The longest block a group function runs; the driver splits longer ones. */
export const BLOCK_MAX = 128;

export interface BlockSlots {
	/** Slot → index of its region's first element in `buffer`. */
	readonly base: ReadonlyMap<number, number>;
	readonly buffer: Float64Array;
}

export function blockSlots(
	runs: readonly NodeRun[],
	groups: readonly (readonly number[])[],
	taps: readonly number[],
): BlockSlots {
	const crossing = crossingSlots(runs, groups, taps);
	const base = new Map(crossing.map((slot, j) => [slot, j * (BLOCK_MAX + 1)]));
	return { base, buffer: new Float64Array(crossing.length * (BLOCK_MAX + 1)) };
}

/** Slots read outside the group that produces them, and every tap slot; sorted. */
export function crossingSlots(
	runs: readonly NodeRun[],
	groups: readonly (readonly number[])[],
	taps: readonly number[],
): number[] {
	const groupOfNode = new Map<number, number>();
	groups.forEach((g, gi) => {
		for (const i of g) groupOfNode.set(i, gi);
	});
	const groupOfSlot = new Map<number, number>();
	runs.forEach((run, i) => {
		for (const slot of outputSlots(run)) groupOfSlot.set(slot, groupOfNode.get(i) as number);
	});
	const crossing = new Set(taps);
	runs.forEach((run, i) => {
		const own = groupOfNode.get(i);
		for (const slot of readSlots(run)) if (groupOfSlot.get(slot) !== own) crossing.add(slot);
	});
	return [...crossing].sort((a, b) => a - b);
}
