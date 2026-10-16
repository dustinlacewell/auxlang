/**
 * Join the playing program's live slots (SlotDecl[]) to the control calls in
 * the code, by site: the k-th of a control's n control ports has site
 * `callSite + k/n` (compile/bind-slots.ts), so `Math.floor(slot.site)` gives
 * the call's own site back. One `ControlWidget` per control call, carrying
 * every slot it owns (xy carries two, in port order) plus the call's code
 * range, for the control-widget decorations to draw and write.
 */

import type { ArgSite, CallSite, SourceMap } from "@/core3/source/source-map";
import type { SlotDecl } from "@/core3/runtime/live/live-contract";
import { CONTROL_VALUE_ARG, type ControlKind, controlKindOf } from "./control-names";

export interface ControlSlot {
	/** Index into `currentSlots()`/`writeSlot`. */
	readonly slotIndex: number;
	readonly decl: SlotDecl;
	/** This port's literal argument, when the value was written as a number in the code. */
	readonly literal: ArgSite;
}

export interface ControlWidget {
	readonly kind: ControlKind;
	readonly call: CallSite;
	readonly slots: readonly ControlSlot[];
}

export function controlWidgetsOf(
	sourceMap: SourceMap,
	slots: readonly SlotDecl[],
): readonly ControlWidget[] {
	const calls = callSitesById(sourceMap);
	const byCall = new Map<number, ControlSlot[]>();

	slots.forEach((decl, slotIndex) => {
		const callId = Math.floor(decl.site);
		const call = calls.get(callId);
		if (call === undefined || controlKindOf(call.callee) === null) return;
		const list = byCall.get(callId) ?? [];
		list.push({ slotIndex, decl, literal: literalForSlot(call, decl.site, callId) });
		byCall.set(callId, list);
	});

	return [...byCall.entries()]
		.map(([callId, controlSlots]) => {
			const call = calls.get(callId);
			const kind = call === undefined ? null : controlKindOf(call.callee);
			if (call === undefined || kind === null) return null;
			return { kind, call, slots: sortByOffset(controlSlots) };
		})
		.filter((w): w is ControlWidget => w !== null);
}

function callSitesById(sourceMap: SourceMap): Map<number, CallSite> {
	const calls = new Map<number, CallSite>();
	for (const site of sourceMap.sites) if (site.kind === "call") calls.set(site.id, site);
	return calls;
}

/** The k-th control port's literal argument, k = round((site - callId) * n). */
function literalForSlot(call: CallSite, site: number, callId: number): ArgSite {
	const argIndexes = CONTROL_VALUE_ARG[controlKindOf(call.callee) as ControlKind];
	const n = argIndexes.length || 1;
	const k = Math.round((site - callId) * n);
	const argIndex = argIndexes[k];
	return argIndex === undefined || argIndex === null ? null : (call.args[argIndex] ?? null);
}

function sortByOffset(slots: readonly ControlSlot[]): readonly ControlSlot[] {
	return [...slots].sort((a, b) => a.decl.site - b.decl.site);
}

/**
 * The index of the slot at exactly `site` in a given slot list — for writing
 * to the PLAYING program: a widget's own `ControlSlot.slotIndex` may have come
 * from an unplayed preview eval, whose slot order can differ from the
 * engine's, so a write always re-resolves the index against `currentSlots()`
 * by site, never reuses the preview's index.
 */
export function slotIndexForSite(slots: readonly SlotDecl[], site: number): number | null {
	const index = slots.findIndex((decl) => decl.site === site);
	return index === -1 ? null : index;
}
