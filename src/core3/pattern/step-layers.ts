/**
 * The layers `.steps()` counts on their own (§4.2): the lane ranges of a
 * top-level stack or polymeter, seen through ops that keep each event in its
 * lane. Anything else is one layer over all its lanes, so a stack nested in
 * a sequence is one step (a chord), not one step per lane.
 */

import type { Pat } from "./ast";
import { width } from "./widths";

export interface LaneRange {
	readonly lo: number;
	readonly hi: number;
}

export function stepLayers(pat: Pat): LaneRange[] {
	return layersAt(pat, 0);
}

function layersAt(pat: Pat, offset: number): LaneRange[] {
	switch (pat.op) {
		case "stack":
			return stacked(pat.children, offset);
		case "polymeter":
			return stacked(
				pat.layers.map((layer) => layer.pat),
				offset,
			);
		case "fast":
		case "slow":
		case "rev":
		case "early":
		case "late":
		case "iter":
		case "swing":
		case "ply":
		case "degrade":
		case "seed":
		case "add":
		case "mul":
		case "with":
		case "slide":
		case "mask":
		case "clip":
		case "sometimesBy":
		case "chordidx":
		case "compact":
			return layersAt(pat.child, offset);
		case "voices": // stable and rr move events between lanes, so their lanes are one layer
			return pat.policy === "packed"
				? layersAt(pat.child, offset)
				: [{ lo: offset, hi: offset + pat.n }];
		default:
			return [{ lo: offset, hi: offset + Math.max(1, width(pat)) }];
	}
}

function stacked(children: readonly Pat[], offset: number): LaneRange[] {
	const out: LaneRange[] = [];
	let at = offset;
	for (const child of children) {
		if (width(child) > 0) out.push(...layersAt(child, at));
		at += width(child);
	}
	return out;
}
