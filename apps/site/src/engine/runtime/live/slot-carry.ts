/**
 * Live slots across a swap: a slot keeps the old engine's value when the
 * old program had a slot at the same site, else it starts at its init. A
 * slot with no site (NaN) never carries. Pure; the engines apply the pairs
 * (runtime/live-engine.ts, wasm/host/carry-plan.ts).
 */

import type { SlotDecl } from "./live-contract";

/** [site, value] per slot, in slot order: what EngineState.liveSlots holds. */
export type SlotEntries = readonly (readonly [number, number])[];

export function slotEntries(decls: readonly SlotDecl[], value: (index: number) => number): SlotEntries {
	return decls.map((decl, i) => [decl.site, value(i)] as const);
}

/** [new index, old index] for each new slot whose site the old slots have. */
export function slotPairs(
	fresh: readonly number[],
	old: readonly number[],
): (readonly [number, number])[] {
	const pairs: (readonly [number, number])[] = [];
	fresh.forEach((site, i) => {
		const from = Number.isNaN(site) ? -1 : old.indexOf(site);
		if (from >= 0) pairs.push([i, from]);
	});
	return pairs;
}

/** Write into `into` the values `entries` carries by site; other slots keep their value (the init). */
export function carriedSlots(
	sites: readonly number[],
	entries: SlotEntries | undefined,
	into: Float64Array,
): void {
	if (entries === undefined) return;
	const old = entries.map(([site]) => site);
	for (const [to, from] of slotPairs(sites, old))
		into[to] = (entries[from] as readonly [number, number])[1];
}
