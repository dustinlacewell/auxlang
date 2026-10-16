/**
 * A program prepared for the worklet (MANIFESTO §8), all on the main
 * thread: the re-eval match against the running program
 * (prepare-program.ts), the program built and compiled to bytes
 * (wasm/host/prepare-wasm.ts), compiled to a Module, warmed on a throwaway
 * instance (warm-module.ts), and the hand-over's carry plan and table carry
 * from the running program (wasm/host/carry-plan.ts, carry/table-carry.ts).
 * With `monitor`, the program is built with the monitor (runtime/live/).
 *
 * The worklet builds the same prepared program into the same start values
 * (worklet/wasm-host-program.ts), so the layout fits them.
 */

import type { Program, Registry } from "../../types";
import { type CarrySide, planCarry } from "../../wasm/host/carry-plan";
import { tableCarry } from "../../wasm/host/carry/table-carry";
import { prepareWasmFrom } from "../../wasm/host/prepare-wasm";
import { BUILD_BUDGET } from "../build/build-budget";
import type { HostPrepared } from "./host-prepared";
import { prepareProgram } from "./prepare-program";
import { warmModule } from "./warm-module";
import type { WasmCarry, WasmPrepared } from "./wasm-prepared";

let serials = 0;

export async function prepareWasmProgram(
	program: Program,
	registry: Registry,
	sampleRate: number,
	running: HostPrepared | undefined,
	budget = BUILD_BUDGET,
	monitor = false,
): Promise<HostPrepared> {
	const from = running?.wasm ?? null;
	const base = prepareProgram(program, registry, sampleRate, from?.facts.identities, monitor);
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
		carry: from === null ? null : carryFrom(from, { layout, facts }),
	};
	return { ...base, wasm, budget };
}

/** The hand-over from the running program: its state copies and its tables. */
function carryFrom(from: WasmPrepared, fresh: CarrySide): WasmCarry {
	return { plan: planCarry(from, fresh), tables: tableCarry(from, fresh), from: from.serial };
}
