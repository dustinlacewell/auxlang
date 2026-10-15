/**
 * Slot reads inside one group's function: a slot the group produces is its
 * local; any other slot comes from its block region (block-slots.ts), which
 * the producing group filled before this one runs.
 */

import { prevLocal, slotLocal } from "../name-table";
import type { SlotAccess } from "../slot-access";
import type { BlockSlots } from "./block-slots";

export function groupAccess(
	own: ReadonlySet<number>,
	block: BlockSlots,
	buffer: string,
): SlotAccess {
	const region = (slot: number): number => {
		const base = block.base.get(slot);
		if (base === undefined)
			throw new Error(`codegen: slot ${slot} crosses groups without a region`);
		return base;
	};
	return {
		cur: (slot) => (own.has(slot) ? slotLocal(slot) : `${buffer}[${region(slot) + 1} + k]`),
		prev: (slot) => (own.has(slot) ? prevLocal(slot) : `${buffer}[${region(slot)} + k]`),
	};
}
