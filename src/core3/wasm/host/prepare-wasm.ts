/**
 * From a Program to WASM bytes plus the values an instance starts from:
 * the engine is built as the offline host builds it (prepare, then every
 * build step, no codegen), and its runs, slots and taps are compiled.
 *
 * Against running identities (a re-eval), the program is matched as the JS
 * engine matches it, so each node gets the same migration key, seed and
 * fresh state. `prepareWasmSwap` also plans the carry from the running
 * engine's layout and facts (carry-plan.ts), for `WasmEngine.handOver`.
 */

import { getRegistry } from "../../module/define";
import { EngineBuild } from "../../runtime/build/engine-build";
import { withProgramSpecs } from "../../runtime/hydrate-specs";
import { slotOf } from "../../runtime/output-slots";
import { type PreparedProgram, prepareProgram } from "../../runtime/prepare/prepare-program";
import type { KeyedIdentity, Program, Registry } from "../../types";
import { type CompiledWasm, type WasmInput, compileWasm } from "../program/compile-program";
import { lambdaSources } from "../program/lambda-sources";
import { type CarrySide, planCarry } from "./carry-plan";
import { type EngineFacts, engineFacts } from "./engine-facts";
import type { WasmStart } from "./wasm-engine";

export interface PreparedWasm {
	readonly compiled: CompiledWasm;
	readonly start: WasmStart;
	readonly facts: EngineFacts;
	/** The hand-over's copies from the running engine (carry-plan.ts); null when nothing runs. */
	readonly carry: Int32Array | null;
}

export function prepareWasm(
	program: Program,
	sampleRate: number,
	registry: Registry = getRegistry(),
	running?: readonly KeyedIdentity[],
): PreparedWasm {
	const layered = withProgramSpecs(registry, program);
	return prepareWasmFrom(prepareProgram(program, layered, sampleRate, running, {}), layered);
}

/**
 * From a program prepared for the interpreter (no driver code) and the
 * registry with its specs: build it, then compile. The worklet builds the
 * same prepared program into the same start values.
 */
export function prepareWasmFrom(prepared: PreparedProgram, layered: Registry): PreparedWasm {
	const built = wasmInputOf(prepared, layered);
	return {
		compiled: compileWasm(built.input),
		start: built.start,
		facts: built.facts,
		carry: null,
	};
}

/** Prepare `program` to take over from the running engine `running` at a swap. */
export function prepareWasmSwap(
	program: Program,
	sampleRate: number,
	registry: Registry,
	running: CarrySide,
): PreparedWasm {
	const prepared = prepareWasm(program, sampleRate, registry, running.facts.identities);
	const side = { layout: prepared.compiled.layout, facts: prepared.facts };
	return { ...prepared, carry: planCarry(running, side) };
}

interface WasmBuilt {
	readonly input: WasmInput;
	readonly start: WasmStart;
	readonly facts: EngineFacts;
}

/** The engine built for `program`: what the compiler reads and what an instance starts from. */
export function buildWasmInput(
	program: Program,
	sampleRate: number,
	registry: Registry = getRegistry(),
	running?: readonly KeyedIdentity[],
): WasmBuilt {
	const layered = withProgramSpecs(registry, program);
	return wasmInputOf(prepareProgram(program, layered, sampleRate, running, {}), layered);
}

function wasmInputOf(prepared: PreparedProgram, layered: Registry): WasmBuilt {
	const { program, sampleRate } = prepared;
	const parts = new EngineBuild(prepared, layered, undefined).finish();
	const taps = (port: string) =>
		Int32Array.from(program.outs, (n) => slotOf(parts.layout, n, port, 0));
	const input: WasmInput = {
		runs: parts.runs,
		modules: program.nodes.map((n) => n.module),
		readsPattern: program.nodes.map((n) => layered.get(n.module)?.reads === "pattern"),
		lambdas: lambdaSources(program.nodes),
		tapsL: taps("l"),
		tapsR: taps("r"),
		size: parts.layout.size,
		sampleRate,
	};
	return { input, start: { runs: parts.runs, cur: parts.bufs.cur }, facts: engineFacts(parts) };
}
