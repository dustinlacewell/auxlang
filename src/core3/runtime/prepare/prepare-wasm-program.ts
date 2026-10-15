/**
 * A program prepared for the worklet's WASM engine (MANIFESTO §8), all on
 * the main thread: the re-eval match against the running program
 * (prepare-program.ts, no driver code), the program built and compiled to
 * bytes (wasm/host/prepare-wasm.ts), compiled to a Module, warmed on a
 * throwaway instance (warm-module.ts), and the hand-over's carry plan from
 * the running WASM program (wasm/host/carry-plan.ts).
 *
 * The worklet builds the same prepared program into the same start values
 * (worklet/wasm-host-program.ts), so the layout fits them. A running JS
 * program is not continued: its state has no memory form.
 */

import type { Program, Registry } from "../../types";
import { planCarry } from "../../wasm/host/carry-plan";
import { prepareWasmFrom } from "../../wasm/host/prepare-wasm";
import type { DriverOptions } from "../driver";
import { type PreparedProgram, prepareProgram } from "./prepare-program";
import { warmModule } from "./warm-module";
import type { WasmPrepared } from "./wasm-prepared";

let serials = 0;

export async function prepareWasmProgram(
	program: Program,
	registry: Registry,
	sampleRate: number,
	running: PreparedProgram | undefined,
	options: DriverOptions,
): Promise<PreparedProgram> {
	const from = running?.wasm ?? null;
	const build = options.build === undefined ? {} : { build: options.build };
	const base = prepareProgram(program, registry, sampleRate, from?.facts.identities, build);
	const prepared = prepareWasmFrom(base, registry);
	const module = await WebAssembly.compile(prepared.compiled.bytes);
	await warmModule(module, prepared);
	const { layout } = prepared.compiled;
	const { facts } = prepared;
	const wasm: WasmPrepared = {
		serial: ++serials,
		module,
		layout,
		facts,
		carry: from === null ? null : { plan: planCarry(from, { layout, facts }), from: from.serial },
	};
	return { ...base, wasm };
}
