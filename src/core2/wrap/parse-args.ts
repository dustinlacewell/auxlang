/**
 * Shared argument parsing for device calls and chaining.
 */

import type { DeviceSpec } from "../device/device-spec";
import type { NodeInput } from "../signal/node-input";
import { normalizeSignal } from "../signal/normalize";
import type { OutputRef } from "../graph/output-ref";

/**
 * Parse args for device invocation or chaining.
 *
 * @param args - The arguments passed to the device/chain call
 * @param spec - The device spec
 * @param skipPositional - Positional arg name to skip (used when chaining binds default input)
 */
export function parseArgs(
	args: unknown[],
	spec: DeviceSpec,
	skipPositional?: string,
): { inputs: Record<string, NodeInput>; config: Record<string, unknown> } {
	const inputs: Record<string, NodeInput> = {};
	// Start with spec defaults, then override with user-provided values
	const config: Record<string, unknown> = { ...spec.config };
	const positionalArgs = (spec.positionalArgs ?? []).filter((p) => p !== skipPositional);

	let positionalIndex = 0;

	for (const arg of args) {
		if (isParamsObject(arg)) {
			for (const [key, value] of Object.entries(arg)) {
				if (key in spec.inputs) {
					inputs[key] = normalizeSignal(value);
				} else if (key in spec.config) {
					config[key] = value;
				}
			}
		} else if (positionalIndex < positionalArgs.length) {
			const paramName = positionalArgs[positionalIndex]!;
			if (paramName in spec.inputs) {
				inputs[paramName] = normalizeSignal(arg);
			} else if (paramName in spec.config) {
				config[paramName] = arg;
			}
			positionalIndex++;
		}
	}

	return { inputs, config };
}

function isParamsObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value) && !isOutputRef(value);
}

function isOutputRef(value: unknown): value is OutputRef {
	return typeof value === "object" && value !== null && "ref" in value && "out" in value;
}
