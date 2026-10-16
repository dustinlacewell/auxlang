/**
 * Merge palette patterns side by side (stack, cat, fastcat, timecat,
 * polymeter, and the off/every/chunk callback branches): each side's palette
 * is appended in order, and its Pat's leaf indices are offset by the
 * combined length of the palettes before it, so every side keeps picking its
 * own members out of one shared, concatenated palette.
 */

import type { Pat } from "../ast";
import { mapPureLeaves } from "./map-pure-leaves";
import type { PaletteSignal } from "./palette-signal";
import { toPalette } from "./to-palette";
import type { Palette } from "./to-palette";

export function mergePalettes(left: Palette, right: Palette): Palette {
	const offset = left.palette.length;
	const shifted = offset === 0 ? right.pat : shiftIndices(right.pat, offset);
	return { pat: shifted, palette: [...left.palette, ...right.palette] };
}

function shiftIndices(pat: Pat, offset: number) {
	return mapPureLeaves(pat, (leaf) => ({ ...leaf, value: leaf.value + offset }));
}

interface Side {
	readonly ast: Pat;
	readonly palette?: readonly PaletteSignal[] | undefined;
}

/**
 * Merge several sides left-to-right. A side with no palette of its own
 * converts via `toPalette` first. When NO side carries a palette, this comes
 * back as a plain Pat list with no palette at all — the common case, which
 * must cost nothing extra.
 */
export function mergeAllPalettes(
	sides: readonly Side[],
): { readonly asts: readonly Pat[]; readonly palette?: readonly PaletteSignal[] } {
	if (sides.every((s) => s.palette === undefined)) return { asts: sides.map((s) => s.ast) };
	const asts: Pat[] = [];
	let palette: PaletteSignal[] = [];
	for (const side of sides) {
		const own: Palette = side.palette === undefined ? toPalette(side.ast) : { pat: side.ast, palette: side.palette };
		const offset = palette.length;
		asts.push(offset === 0 ? own.pat : shiftIndices(own.pat, offset));
		palette = [...palette, ...own.palette];
	}
	return { asts, palette };
}
