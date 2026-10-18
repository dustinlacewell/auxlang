/**
 * Live slots (runtime/live/live-contract.ts) bound into the graph, before the
 * mods desugar, so a modulated port's base can read a slot:
 *
 * - A control port (PortAnn `slot`) bound to a number, or left at its
 *   default, reads a slot at the control call's site, with the range its
 *   range ports give when they are constants. The k-th of a module's n
 *   control ports gets site `call + k/n`: the first is the call's own site,
 *   and `Math.floor` of any of them gives the call back (xy: x at the call,
 *   y at call + 0.5). Stable while the module keeps its control ports.
 * - With `slotSites`, a number bound from a literal whose site is in the set
 *   reads a slot at that site, with the unit and range of the port it feeds
 *   (its node's own `ins`, the same table `bindControls` reads) — or neither,
 *   when it feeds no known port (an open-group member, a config value).
 *
 * A control built with no location tables gets site NaN: it plays, but no
 * swap carries it. A slot is a constant to identity (constant-evidence.ts).
 */

import { nodePorts } from "@/engine/module/node-ports";
import type { GNode, InputValue } from "../graph/node";
import { type SpecTable, resolveSpec } from "../module/resolve";
import type { SlotDecl } from "../runtime/live/live-contract";
import type { PortAnn, SlotRange } from "../types";

export function bindSlots(
	nodes: readonly GNode[],
	specs: SpecTable,
	slotSites: ReadonlySet<number> | undefined,
): void {
	for (const node of nodes) {
		const ins = nodePorts(resolveSpec(node.module, specs), node.groups).ins;
		bindControls(node, ins);
		if (slotSites !== undefined) bindLiterals(node, ins, slotSites);
	}
}

function bindControls(node: GNode, ins: Record<string, PortAnn>): void {
	const controls = Object.keys(ins).filter((port) => ins[port]?.slot !== undefined);
	controls.forEach((port, k) => {
		const ann = ins[port] as PortAnn;
		const init = node.inputs[port] ?? ann.def;
		if (typeof init !== "number") return;
		const site = node.site === undefined ? Number.NaN : node.site + k / controls.length;
		node.inputs[port] = { slot: { site, init, ...bounds(node, ins, ann.slot as SlotRange) } };
	});
}

/** The range bounds that are numbers: fixed, or a range port's constant. */
function bounds(node: GNode, ins: Record<string, PortAnn>, range: SlotRange): Partial<SlotDecl> {
	const min = bound(node, ins, range.min);
	const max = bound(node, ins, range.max);
	return { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
}

function bound(node: GNode, ins: Record<string, PortAnn>, by: string | number): number | undefined {
	if (typeof by === "number") return by;
	const value: InputValue | number | null | undefined = node.inputs[by] ?? ins[by]?.def;
	return typeof value === "number" ? value : undefined;
}

function bindLiterals(node: GNode, ins: Record<string, PortAnn>, slotSites: ReadonlySet<number>): void {
	for (const [port, site] of Object.entries(node.bindingSites ?? {})) {
		const init = node.inputs[port];
		if (typeof init !== "number" || !slotSites.has(site)) continue;
		const ann = ins[port];
		const range = ann?.range;
		node.inputs[port] = {
			slot: {
				site,
				init,
				...(ann !== undefined ? { unit: ann.unit } : {}),
				...(range !== undefined ? { min: range.min, max: range.max } : {}),
			},
		};
	}
}
