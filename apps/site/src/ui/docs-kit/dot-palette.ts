/**
 * The site's `DotPalette`: `programToDot` needs colors, and the engine
 * doesn't own them, so this builds the palette from the design system's
 * colors (@/ui/design/colors) for every call site to pass in.
 */

import type { DotPalette } from "auxlang/viz/dot-colors";
import { categoryColors, graphNodeFill, outNodeInk, unitColors } from "@/ui/design/colors";

export const DOT_PALETTE: DotPalette = {
	categoryColors,
	unitColors,
	nodeFill: graphNodeFill,
	outNodeInk,
};
