/**
 * The two engines a re-eval test runs on: the interpreter (the reference)
 * and WASM. `create` builds an engine, fresh or continuing a snapshot;
 * `swap` builds one that takes over from a running engine of the same
 * backend as a host swap does — the interpreter from its state, WASM memory
 * to memory along the carry plan.
 */

import { Core3Engine } from "@/engine/runtime/engine";
import type { EngineState, Program, Registry } from "@/engine/types";
import { createWasmEngine, swapWasmEngine } from "@/engine/wasm/host/create-wasm-engine";
import type { WasmEngine } from "@/engine/wasm/host/wasm-engine";

export interface TestEngine {
	tick(out: Float32Array): void;
	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void;
	peek(node: number, port: string, lane: number): number;
	collectState(): EngineState;
	readonly sampleCount: number;
}

export interface Backend {
	readonly name: string;
	create(program: Program, sampleRate: number, registry: Registry, prev?: EngineState): TestEngine;
	swap(program: Program, sampleRate: number, registry: Registry, running: TestEngine): TestEngine;
}

export const JS_BACKEND: Backend = {
	name: "interpreter",
	create: (program, sampleRate, registry, prev) =>
		new Core3Engine(program, sampleRate, registry, prev),
	swap: (program, sampleRate, registry, running) =>
		new Core3Engine(program, sampleRate, registry, running.collectState()),
};

export const WASM_BACKEND: Backend = {
	name: "wasm",
	create: createWasmEngine,
	swap: (program, sampleRate, registry, running) =>
		swapWasmEngine(program, sampleRate, registry, running as WasmEngine),
};

export const BACKENDS: readonly Backend[] = [JS_BACKEND, WASM_BACKEND];
