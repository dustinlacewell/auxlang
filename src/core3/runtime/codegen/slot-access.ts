/**
 * How generated code reads a slot's value: this sample's (`cur`) or the
 * previous sample's (`prev`). A group function reads its own slots from
 * locals (name-table.ts) and slots another group produced from that group's
 * block buffer (group/group-access.ts).
 */

export interface SlotAccess {
	cur(slot: number): string;
	prev(slot: number): string;
}
