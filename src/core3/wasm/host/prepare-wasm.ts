/**
 * From a Program to WASM bytes plus the values an instance starts from:
 * the engine is built as the offline host builds it (prepare, then every
 * build step, no codegen), and its runs, slots and taps are compiled.
 */

import { getRegistry } from "../../module/define";
import { EngineBuild } from "../../runtime/build/engine-build";
import { withProgramSpecs } from "../../runtime/hydrate-specs";
import { slotOf } from "../../runtime/output-slots";
import { prepareProgram } from "../../runtime/prepare/prepare-program";
import type { Program, Registry } from "../../types";
import { type CompiledWasm, type WasmInput, compileWasm } from "../program/compile-program";
import type { WasmStart } from "./wasm-engine";

export interface PreparedWasm {
	readonly compiled: CompiledWasm;
	readonly start: WasmStart;
}

export function prepareWasm(
	program: Program,
	sampleRate: number,
	registry: Registry = getRegistry(),
): PreparedWasm {
	const built = buildWasmInput(program, sampleRate, registry);
	return { compiled: compileWasm(built.input), start: built.start };
}

/** The engine built for `program`: what the compiler reads and what an instance starts from. */
export function buildWasmInput(
	program: Program,
	sampleRate: number,
	registry: Registry = getRegistry(),
): { input: WasmInput; start: WasmStart } {
	const layered = withProgramSpecs(registry, program);
	const prepared = prepareProgram(program, layered, sampleRate, undefined, {});
	const parts = new EngineBuild(prepared, layered, undefined).finish();
	const taps = (port: string) =>
		Int32Array.from(program.outs, (n) => slotOf(parts.layout, n, port, 0));
	const input: WasmInput = {
		runs: parts.runs,
		modules: program.nodes.map((n) => n.module),
		readsPattern: program.nodes.map((n) => layered.get(n.module)?.reads === "pattern"),
		tapsL: taps("l"),
		tapsR: taps("r"),
		size: parts.layout.size,
		sampleRate,
	};
	return { input, start: { runs: parts.runs, cur: parts.bufs.cur } };
}
