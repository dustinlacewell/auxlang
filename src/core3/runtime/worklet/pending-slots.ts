/**
 * Slot writes for a program that is not playing yet. The main thread writes
 * the slots of the last program it posted (audio.ts `currentSlots`), so a
 * write that arrives while that program is queued or building is held here
 * and applied after its swap's carry: newer than the carried value, it wins.
 * Preallocated per program; a write allocates nothing.
 */

import { type SlotTarget, applySlotWrites, isSlotIndex } from "../live/slot-target";

export class PendingSlots implements SlotTarget {
	private readonly values: Float64Array;
	private readonly dirty: Uint8Array;
	private any = false;

	constructor(count: number) {
		this.values = new Float64Array(count);
		this.dirty = new Uint8Array(count);
	}

	writeSlot(index: number, value: number): void {
		if (!isSlotIndex(index, this.values.length)) return;
		this.values[index] = value;
		this.dirty[index] = 1;
		this.any = true;
	}

	writeSlots(pairs: Float64Array): void {
		applySlotWrites(pairs, this);
	}

	/** Write every held value into `target`, then hold none. */
	flushInto(target: SlotTarget): void {
		if (!this.any) return;
		for (let i = 0; i < this.values.length; i++) {
			if (this.dirty[i] === 0) continue;
			target.writeSlot(i, this.values[i] as number);
			this.dirty[i] = 0;
		}
		this.any = false;
	}
}
