/**
 * Warm a compiled module on the main thread before it is posted: render a
 * throwaway instance for WARM_SECONDS of audio. V8 compiles WASM functions
 * lazily (on their first call) and tiers hot ones up to TurboFan, into the
 * module's shared code, which a posted Module brings to the worklet. Measured
 * (src/tests/scratch/wasm-warm-share.ts, coastline, Node worker): the other
 * thread's instance starts on TurboFan code, first block 0.5–0.9 ms against
 * 19 ms unwarmed.
 */

import { linkInstanceAsync } from "../../wasm/host/link-instance";
import type { PreparedWasm } from "../../wasm/host/prepare-wasm";
import { WasmEngine } from "../../wasm/host/wasm-engine";
import { BLOCK_MAX } from "../../wasm/program/memory-layout";

export const WARM_SECONDS = 0.25;

export async function warmModule(
	module: WebAssembly.Module,
	prepared: PreparedWasm,
	seconds = WARM_SECONDS,
): Promise<void> {
	const engine = new WasmEngine(await linkInstanceAsync(module), prepared);
	engine.prefill(0);
	const l = new Float32Array(BLOCK_MAX);
	const r = new Float32Array(BLOCK_MAX);
	const samples = seconds * prepared.facts.sampleRate;
	for (let at = 0; at < samples; at += BLOCK_MAX) engine.renderBlock(l, r, 0, BLOCK_MAX);
}
