/**
 * The palette's only door into DOT emission. String emitters can't compose
 * <PortSwatch>/<ModuleBadge>, so these typed helpers play the same role: a
 * Unit or Category goes in, an attribute-ready color comes out — no raw
 * palette indexing at emit sites. Nodes share one neutral fill; the category
 * colors the label ink, and `out` is pure white.
 */

import type { Category, Unit } from "@/core3/types";
import { categoryColors, graphNodeFill, outNodeInk, unitColors } from "@/theme/colors";

/** Wires whose source port carries no unit annotation fall back to neutral gray. */
const UNKNOWN_UNIT_COLOR = "#9ca3af";

/** The single fill every node shares — identity lives in the ink, not the fill. */
export const nodeFill = graphNodeFill;

/** Label ink: the module's saturated category color. */
export function nodeInkColor(category: Category): string {
	return categoryColors[category];
}

/** Label ink for `out` nodes — the graph's terminal, white, outside the palette. */
export const outNodeInkColor = outNodeInk;

/** Edge stroke: the pastel of the unit flowing through the wire. */
export function edgeStrokeColor(unit: Unit | undefined): string {
	return unit ? unitColors[unit] : UNKNOWN_UNIT_COLOR;
}
