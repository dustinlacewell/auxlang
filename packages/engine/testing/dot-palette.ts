/**
 * A fixed `DotPalette` for engine tests that call `programToDot` — the
 * engine doesn't own colors, so tests supply arbitrary, stable ones.
 */

import type { DotPalette } from "../src/viz/dot-colors";

export const TEST_DOT_PALETTE: DotPalette = {
	categoryColors: {
		timing: "#4da3e8",
		sources: "#e08c3a",
		filters: "#a878e8",
		envelopes: "#d6b13f",
		effects: "#3ec6d6",
		drums: "#e368a6",
		bridge: "#7cc242",
		utils: "#8a93a3",
	},
	unitColors: {
		sig: "#c4c4c0",
		hz: "#9db8ea",
		semis: "#b9a7ec",
		unit: "#a8cba0",
		beats: "#e6d192",
		secs: "#eab58e",
		phase: "#e39390",
		gate: "#eaa4c5",
		trig: "#d99ae6",
	},
	nodeFill: "#26262d",
	outNodeInk: "#ffffff",
};
