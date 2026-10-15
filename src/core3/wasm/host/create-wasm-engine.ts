/**
 * WASM engines built in one go, as runtime/engine.ts builds the JS one: the
 * offline host's form and the tests'. `createWasmEngine` has the
 * `EngineCtor` signature: fresh, or continuing a snapshot through the codec. `swapWasmEngine` takes
 * over from a running WASM engine as the worklet will: prepared against it,
 * then carried memory to memory along the plan.
 */

import type { EngineState, Program, Registry } from "../../types";
import { prepareWasm, prepareWasmSwap } from "./prepare-wasm";
import { WasmEngine } from "./wasm-engine";

export function createWasmEngine(
	program: Program,
	sampleRate: number,
	registry: Registry,
	prev?: EngineState,
): WasmEngine {
	const prepared = prepareWasm(program, sampleRate, registry, prev?.identities);
	const engine = new WasmEngine(new WebAssembly.Module(prepared.compiled.bytes), prepared);
	if (prev !== undefined) engine.load(prev);
	return engine;
}

export function swapWasmEngine(
	program: Program,
	sampleRate: number,
	registry: Registry,
	running: WasmEngine,
): WasmEngine {
	const prepared = prepareWasmSwap(program, sampleRate, registry, running.side);
	const engine = new WasmEngine(new WebAssembly.Module(prepared.compiled.bytes), prepared);
	engine.handOver(running.liveState());
	return engine;
}
