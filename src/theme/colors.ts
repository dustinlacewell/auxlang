/**
 * The color convention — single source of truth for signal-unit and
 * module-category colors. Units are pastel (edges/ports); categories are
 * saturated (node/module identity). `satisfies` pins each map to the real
 * core3 taxonomy, so adding a Unit or Category without a color is a type
 * error. Tailwind mirrors of these live in src/ui/styles/globals.css
 * (`--color-unit-*` / `--color-category-*`) — keep them in sync.
 */

import type { Category, Unit } from "@/core3/types";

export const unitColors = {
	sig: "#c4c4c0",
	hz: "#9db8ea",
	semis: "#b9a7ec",
	unit: "#a8cba0",
	beats: "#e6d192",
	secs: "#eab58e",
	phase: "#e39390",
	gate: "#eaa4c5",
	trig: "#d99ae6",
} as const satisfies Record<Unit, string>;

export const categoryColors = {
	timing: "#4da3e8",
	sources: "#e08c3a",
	filters: "#a878e8",
	envelopes: "#d6b13f",
	effects: "#3ec6d6",
	drums: "#e368a6",
	bridge: "#7cc242",
	utils: "#8a93a3",
} as const satisfies Record<Category, string>;

/** Dark ink for text sitting on the bright category fills. */
export const onCategoryText = "#1a1a1a";

/** Graph rendering: a deep well behind the graph, one neutral chip fill for
 * every node — identity lives in the label ink (category color; `out` is pure
 * white, the terminal outside the palette). */
export const graphBg = "#0c0c0e";
export const graphNodeFill = "#26262d";
export const outNodeInk = "#ffffff";

export type UnitColor = keyof typeof unitColors;
export type CategoryColor = keyof typeof categoryColors;
