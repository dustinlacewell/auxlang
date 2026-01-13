/**
 * Hydrate process functions from source or WASM.
 */

import { hydrateFunction } from "../../../hydrate-function";
import type { WorkletSpec } from "../../../worklet-types";
import type { ProcessAllFn, ProcessFn } from "./types";

export function hydrateProcessFn(
	spec: WorkletSpec,
	wasmInstance: WebAssembly.Instance | undefined,
): { process?: ProcessFn; processAll?: ProcessAllFn } {
	if (wasmInstance) {
		return { process: createWasmProcess(wasmInstance, spec) };
	}
	if (spec.processAllSource) {
		return { processAll: hydrateFunction(spec.processAllSource) as ProcessAllFn };
	}
	if (spec.processSource) {
		return { process: hydrateFunction(spec.processSource) as ProcessFn };
	}
	return {};
}

function createWasmProcess(instance: WebAssembly.Instance, spec: WorkletSpec): ProcessFn {
	const exports = instance.exports as Record<string, unknown>;
	const processExport = exports.process as ((input: number) => number) | undefined;
	if (!processExport) throw new Error("WASM module missing 'process' export");

	const inputNames = Object.keys(spec.inputs).sort();
	const setters: ((v: number) => void)[] = [];
	for (const name of inputNames) {
		const setter = exports[`set_${name}`] as ((v: number) => void) | undefined;
		if (setter) setters.push(setter);
	}

	const defaultInput = spec.defaultInput;
	const defaultOutput = spec.defaultOutput;

	return (inputs, _config, _state, _sampleRate, _time, out) => {
		for (let i = 0; i < inputNames.length; i++) {
			setters[i]?.(inputs[inputNames[i]!] ?? 0);
		}
		out[defaultOutput] = processExport(inputs[defaultInput] ?? 0);
	};
}
