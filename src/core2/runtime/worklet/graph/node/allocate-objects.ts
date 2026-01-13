/**
 * Pre-allocate input/output objects for reuse every sample.
 */

import type { WorkletSpec } from "../../../worklet-types";

export function createInputObject(spec: WorkletSpec): Record<string, number> {
	const inputs: Record<string, number> = {};
	for (const name of Object.keys(spec.inputs)) {
		inputs[name] = spec.inputs[name]!.default;
	}
	return inputs;
}

export function createInputArrayObject(spec: WorkletSpec): Record<string, number[]> {
	const arrays: Record<string, number[]> = {};
	for (const name of Object.keys(spec.inputs)) {
		arrays[name] = [spec.inputs[name]!.default];
	}
	return arrays;
}

export function createOutputObject(spec: WorkletSpec): Record<string, number> {
	const outputs: Record<string, number> = {};
	for (const out of spec.outputs) {
		outputs[out] = 0;
	}
	return outputs;
}
