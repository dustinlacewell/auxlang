/**
 * The program's live slots (Program.liveSlots), indexed in the order emit
 * first reads them. Slots with one site are one slot: a control copied by
 * value semantics (`a.slew(0)` copies `a`) keeps its call's site, and both
 * copies read what the editor writes there. A slot with no site (NaN) is
 * its own.
 */

import type { SlotDecl } from "../runtime/live/live-contract";

export class SlotTable {
	private readonly decls: SlotDecl[] = [];
	private readonly byDecl = new Map<SlotDecl, number>();
	private readonly bySite = new Map<number, number>();

	index(decl: SlotDecl): number {
		const known = this.byDecl.get(decl) ?? this.siteIndex(decl.site);
		if (known !== undefined) return known;
		const index = this.decls.length;
		this.decls.push(decl);
		this.byDecl.set(decl, index);
		if (!Number.isNaN(decl.site)) this.bySite.set(decl.site, index);
		return index;
	}

	get list(): readonly SlotDecl[] {
		return this.decls;
	}

	private siteIndex(site: number): number | undefined {
		return Number.isNaN(site) ? undefined : this.bySite.get(site);
	}
}
