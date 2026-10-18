/**
 * Numeric literals a plain drag can grab (`drag-any-number`): every number
 * site in the code, each paired with its live slot once one exists (the
 * first drag turns a literal into a slot; `bindLiterals` in
 * compile/bind-slots.ts keeps a literal slot's site equal to the literal's
 * own site, unlike a control's `call + k/n`).
 */

import type { SourceMap } from "auxlang/source/source-map";
import type { SlotDecl } from "auxlang/runtime/live/live-contract";

export interface DraggableNumber {
	readonly site: number;
	readonly text: string;
	readonly range: { readonly start: number; readonly end: number };
	/** The slot already bound to this literal, once the editor has dragged it once. */
	readonly slotIndex: number | null;
}

export function draggableNumbersOf(
	docText: string,
	sourceMap: SourceMap,
	slots: readonly SlotDecl[],
): readonly DraggableNumber[] {
	const slotIndexBySite = new Map<number, number>();
	slots.forEach((decl, index) => {
		if (Number.isInteger(decl.site)) slotIndexBySite.set(decl.site, index);
	});

	return sourceMap.sites
		.filter((site) => site.kind === "number")
		.map((site) => ({
			site: site.id,
			text: docText.slice(site.range.start, site.range.end),
			range: site.range,
			slotIndex: slotIndexBySite.get(site.id) ?? null,
		}));
}

/** The number site whose range contains `pos`, or null. */
export function numberSiteAt(
	numbers: readonly DraggableNumber[],
	pos: number,
): DraggableNumber | null {
	return numbers.find((n) => pos >= n.range.start && pos <= n.range.end) ?? null;
}
