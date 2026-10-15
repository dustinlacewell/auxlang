/**
 * An instance's memory as the views a hand-over copies through: f64 for
 * numbers and Float64Array state, i32 words for every other typed array
 * (layout/state-shape.ts keeps each region 8-aligned and a multiple of 8
 * bytes). Built once per instance. `memory.grow` detaches them (step 6
 * refreshes them).
 */

export interface WasmMemory {
	readonly f64: Float64Array;
	readonly i32: Int32Array;
}

export function memoryViews(buffer: ArrayBuffer): WasmMemory {
	return { f64: new Float64Array(buffer), i32: new Int32Array(buffer) };
}
