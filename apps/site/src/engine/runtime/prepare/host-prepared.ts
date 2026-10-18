/**
 * A program as the main thread posts it to the worklet (worklet/messages.ts):
 * the program prepared for the engine build (prepare-program.ts: the start
 * values the WASM memory is written from), its WASM module, layout and
 * carry (wasm-prepared.ts), and the build budget the worklet spends on it
 * per block (build/build-budget.ts).
 */

import type { PreparedProgram } from "./prepare-program";
import type { WasmPrepared } from "./wasm-prepared";

export interface HostPrepared extends PreparedProgram {
	readonly wasm: WasmPrepared;
	/** Estimated microseconds of build steps per block. */
	readonly budget: number;
}
