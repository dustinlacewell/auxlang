/**
 * A program on the worklet host (live-host.ts), from its prepared form to
 * the engine that plays it: built a budget at a time while the old program
 * plays, swapped in at a block boundary, then rendered. Two kinds, by the
 * prepared program's backend: the JS engine (js-host-program.ts) and the
 * WASM engine (wasm-host-program.ts).
 *
 * `source` is the program it will continue at the swap (the host builds
 * one program at a time, so it is still the one playing then). A program
 * continues only one of its own kind; else it starts fresh.
 */

import type { Registry } from "../../types";
import type { PreparedProgram } from "../prepare/prepare-program";
import { JsHostProgram } from "./js-host-program";
import { WasmHostProgram } from "./wasm-host-program";

export interface HostProgram {
	readonly prepared: PreparedProgram;
	/** True when every build step has run: the next block swaps it in. */
	readonly built: boolean;
	/** Run build steps within `budget` (estimated microseconds). */
	advance(budget: number): void;
	/** The swap block's work: continue the source. Copies only. */
	swapIn(): void;
	/** Advance `n` samples; write l/r into `outL`/`outR` from `offset`. Once swapped in. */
	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void;
}

export function hostProgram(
	prepared: PreparedProgram,
	registry: Registry,
	source: HostProgram | null,
): HostProgram {
	if (prepared.wasm !== null) return new WasmHostProgram(prepared, prepared.wasm, registry, source);
	return new JsHostProgram(prepared, registry, source);
}
