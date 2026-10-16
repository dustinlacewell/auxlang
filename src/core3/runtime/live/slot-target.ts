/**
 * What a slot write lands in: an engine's live slots (either engine), or a
 * program not yet playing (worklet/pending-slots.ts). `applySlotWrites`
 * walks a SlotWrites message's [index, value] pairs into one. Allocates
 * nothing; an index the target does not have is dropped.
 */

export interface SlotTarget {
	writeSlot(index: number, value: number): void;
}

export function applySlotWrites(pairs: Float64Array, target: SlotTarget): void {
	for (let i = 0; i + 1 < pairs.length; i += 2) {
		target.writeSlot(pairs[i] as number, pairs[i + 1] as number);
	}
}

/** True when `index` names one of `count` slots. */
export function isSlotIndex(index: number, count: number): boolean {
	return Number.isInteger(index) && index >= 0 && index < count;
}
