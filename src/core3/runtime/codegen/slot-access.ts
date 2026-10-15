/**
 * How generated code reads a slot's value: this sample's (`cur`) or the
 * previous sample's (`prev`). Inside one function, slots are locals
 * (name-table.ts); a grouped driver reads slots another group produced from
 * that group's block buffer (group/block-slots.ts).
 */

import { prevLocal, slotLocal } from "./name-table";

export interface SlotAccess {
	cur(slot: number): string;
	prev(slot: number): string;
}

/** Every slot is a local of the function reading it. */
export const LOCAL_SLOTS: SlotAccess = { cur: slotLocal, prev: prevLocal };
