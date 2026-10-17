/**
 * Where an engine's display buffers come from (live-contract.ts's third
 * frame section): `words` is the section's total length, `copyInto` writes
 * it at `at` in `into`. One per engine (wasm/host/wasm-engine.ts,
 * interpreted-monitor.ts), built from its own displayList (display-list.ts).
 */

export interface DisplaySource {
	readonly words: number;
	copyInto(into: Float64Array, at: number): void;
}

/** No display data: a program with none, or no engine to read from yet. */
export const EMPTY_DISPLAY_SOURCE: DisplaySource = {
	words: 0,
	copyInto(): void {},
};
