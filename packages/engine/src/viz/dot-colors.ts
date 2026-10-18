/**
 * The palette's only door into DOT emission. String emitters can't compose
 * <PortSwatch>/<ModuleBadge>, so these typed helpers play the same role: a
 * Unit or Category goes in, an attribute-ready color comes out — no raw
 * palette indexing at emit sites. Nodes share one neutral fill; the category
 * colors the label ink, and `out` is pure white.
 *
 * The engine owns graph structure, not color: callers inject a `DotPalette`
 * (the site builds one from its design system; engine tests use a fixed one).
 */

import type { Category, Unit } from "../types";

/** Exactly the colors `programToDot` needs, supplied by the caller. */
export interface DotPalette {
	/** Label ink per module category. */
	readonly categoryColors: Record<Category, string>;
	/** Edge stroke per signal unit. */
	readonly unitColors: Record<Unit, string>;
	/** The single fill every node shares. */
	readonly nodeFill: string;
	/** Label ink for `out` nodes — the graph's terminal, outside the palette. */
	readonly outNodeInk: string;
}

/** Wires whose source port carries no unit annotation fall back to neutral gray. */
const UNKNOWN_UNIT_COLOR = "#9ca3af";

/** Label ink: the module's saturated category color. */
export function nodeInkColor(palette: DotPalette, category: Category): string {
	return palette.categoryColors[category];
}

/** Edge stroke: the pastel of the unit flowing through the wire. */
export function edgeStrokeColor(palette: DotPalette, unit: Unit | undefined): string {
	return unit ? palette.unitColors[unit] : UNKNOWN_UNIT_COLOR;
}
