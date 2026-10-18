/**
 * A palette P bound to any input becomes `mux(seq(indexPattern), palette)`:
 * the pattern itself is a plain index pattern (no signals left in it —
 * compile/expand-patterns.ts sees only that, same as any other pattern
 * input), and the palette's signals/numbers become `mux`'s palette group.
 */

import type { NodeRef } from "../graph/node";
import { getModule } from "../module/define";
import type { Pat } from "../pattern/ast";
import type { PaletteSignal } from "../pattern/palette/palette-signal";
import { P } from "../pattern/pat-class";
import { buildNode } from "./build-node";
import { seq } from "./seq";

export function buildPaletteMux(indexPattern: Pat, palette: readonly PaletteSignal[]): NodeRef {
	const index = seq(new P(indexPattern));
	const mux = buildNode(getModule("mux"), [{ index, palette: [...palette] }]);
	return { node: mux, port: "out" };
}
