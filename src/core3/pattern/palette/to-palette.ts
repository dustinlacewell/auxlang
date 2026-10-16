/**
 * Convert a plain Pat (every `pure` leaf is a payload number) into a palette
 * pattern: every DISTINCT number becomes one palette member, and the leaf
 * becomes that member's index. Used both when a template splice turns a
 * pattern into a palette pattern, and when a plain P joins a palette P
 * (merge-palettes).
 */

import type { Pat } from "../ast";
import type { PaletteSignal } from "./palette-signal";
import { mapPureLeaves } from "./map-pure-leaves";

export interface Palette {
	readonly pat: Pat;
	readonly palette: readonly PaletteSignal[];
}

export function toPalette(pat: Pat): Palette {
	const members: number[] = [];
	const indexOf = new Map<number, number>();
	const indexed = mapPureLeaves(pat, (leaf) => {
		const found = indexOf.get(leaf.value);
		if (found !== undefined) return { ...leaf, value: found };
		const index = members.length;
		members.push(leaf.value);
		indexOf.set(leaf.value, index);
		return { ...leaf, value: index };
	});
	return { pat: indexed, palette: members };
}
