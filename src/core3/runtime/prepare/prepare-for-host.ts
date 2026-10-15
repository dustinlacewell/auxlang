/**
 * Prepare a program for the worklet on the backend the options name
 * (host-options.ts), against the program running before it (or none, for a
 * fresh start): the JS engine's prepared program (prepare-program.ts), or
 * one compiled to WASM and warmed (prepare-wasm-program.ts).
 */

import type { Program, Registry } from "../../types";
import { DEFAULT_BACKEND, type HostOptions } from "./host-options";
import { type PreparedProgram, prepareProgram } from "./prepare-program";
import { prepareWasmProgram } from "./prepare-wasm-program";

export async function prepareForHost(
	program: Program,
	registry: Registry,
	sampleRate: number,
	running: PreparedProgram | undefined,
	options: HostOptions,
): Promise<PreparedProgram> {
	if ((options.backend ?? DEFAULT_BACKEND) === "wasm")
		return prepareWasmProgram(program, registry, sampleRate, running, options);
	return prepareProgram(program, registry, sampleRate, running?.identities, options);
}
