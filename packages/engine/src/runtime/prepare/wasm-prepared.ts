/**
 * The WASM part of a prepared program (prepare-wasm-program.ts), as the main
 * thread posts it to the worklet: the compiled and warmed Module
 * (structured-cloneable; it shares its compiled code across threads), the
 * memory layout and engine facts (plain data), and the hand-over's carry
 * plan and table carry from the program it was prepared against.
 *
 * Each has a serial; a carry names the serial it was planned from. The
 * worklet carries only from the engine of that program: a plan is raw
 * memory offsets, valid for that layout alone (after a failed build the
 * running engine is an older one).
 */

import type { TableCarry } from "../../wasm/host/carry/table-carry";
import type { EngineFacts } from "../../wasm/host/engine-facts";
import type { WasmLayout } from "../../wasm/program/memory-layout";

export interface WasmCarry {
	readonly plan: Int32Array;
	/** What each table lane takes from the old engine's tables at the prefill. */
	readonly tables: TableCarry;
	/** The serial of the program the plan copies from. */
	readonly from: number;
}

export interface WasmPrepared {
	readonly serial: number;
	readonly module: WebAssembly.Module;
	readonly layout: WasmLayout;
	readonly facts: EngineFacts;
	readonly carry: WasmCarry | null;
}
