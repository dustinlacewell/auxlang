/**
 * Device factory - creates device functions that produce nodes.
 */

import type { NodeInput } from "../signal/node-input";
import { normalizeSignal } from "../signal/normalize";
import { wrap } from "../wrap/wrap";
import type { ConfigValue } from "../signal/config-value";
import { createNode } from "../graph/create-node";
import { createDeviceNode } from "./create-device-node";
import { getBuilder } from "../graph/graph-builder";
import type { DeviceSpec } from "./device-spec";
import type { TypedProcessAllFn, TypedProcessFn } from "./process-fn";
import { registerDevice } from "./registry";
import type { WrappedNode } from "../wrap/wrap";

/**
 * Input for device spec - generic over inputs for typed process functions.
 */
export interface DeviceSpecInput<I extends Record<string, number | number[]> = Record<string, number | number[]>> {
	inputs: I;
	outputs: readonly string[];
	defaultInput: string & keyof I;
	defaultOutput: string;
	positionalArgs?: readonly string[]; // Can include both input and config keys
	config?: Record<string, ConfigValue>;
	process?: TypedProcessFn<I>;
	processAll?: TypedProcessAllFn<I>;
	wasmUrl?: string;
	polyphonic?: boolean;
	expand?: DeviceSpec["expand"];
}

function normalizeSpec(name: string, input: DeviceSpecInput): DeviceSpec {
	// Validate: expand and processAll are mutually exclusive
	if (input.expand && input.processAll) {
		throw new Error(`Device "${name}": expand and processAll are mutually exclusive`);
	}

	// Validate: polyphonic devices must have either expand or processAll
	if (input.polyphonic && !input.expand && !input.processAll) {
		throw new Error(`Device "${name}": polyphonic devices must have expand or processAll`);
	}

	// Validate: processAll requires polyphonic
	if (input.processAll && !input.polyphonic) {
		throw new Error(`Device "${name}": processAll requires polyphonic: true`);
	}

	// Build spec, only adding optional fields if defined
	const spec = {
		inputs: input.inputs,
		config: input.config ?? {},
		outputs: input.outputs,
		defaultInput: input.defaultInput,
		defaultOutput: input.defaultOutput,
		positionalArgs: input.positionalArgs ?? [],
	} as DeviceSpec;

	if (input.process !== undefined) {
		(spec as { process: DeviceSpec["process"] }).process = input.process;
	}
	if (input.processAll !== undefined) {
		(spec as { processAll: DeviceSpec["processAll"] }).processAll = input.processAll;
	}
	if (input.wasmUrl !== undefined) {
		(spec as { wasmUrl: string }).wasmUrl = input.wasmUrl;
	}
	if (input.polyphonic !== undefined) {
		(spec as { polyphonic: boolean }).polyphonic = input.polyphonic;
	}
	if (input.expand !== undefined) {
		(spec as { expand: DeviceSpec["expand"] }).expand = input.expand;
	}

	return spec;
}

let anonCounter = 0;

/**
 * Create a named device (registers for chaining).
 */
export function device<I extends Record<string, number | number[]>>(
	name: string,
	specInput: DeviceSpecInput<I>,
): DeviceFactory;

/**
 * Create an anonymous device (not registered for chaining).
 */
export function device<I extends Record<string, number | number[]>>(specInput: DeviceSpecInput<I>): DeviceFactory;

export function device<I extends Record<string, number | number[]>>(
	nameOrSpec: string | DeviceSpecInput<I>,
	maybeSpec?: DeviceSpecInput<I>,
): DeviceFactory {
	const isAnonymous = typeof nameOrSpec !== "string";
	const name = isAnonymous ? `_anon${++anonCounter}` : nameOrSpec;
	const specInput = isAnonymous ? nameOrSpec : maybeSpec!;

	// Cast is safe - generics are erased at runtime, normalizeSpec just copies fields
	const spec = normalizeSpec(name, specInput as unknown as DeviceSpecInput);
	const positionalArgs = spec.positionalArgs ?? [];

	let factory: DeviceFactory;

	if (isAnonymous) {
		// Anonymous device: creates node and registers with builder
		// (same as named devices - needed for expand() to capture intermediate nodes)
		factory = ((...args: unknown[]) => {
			const { inputs, config } = parseFactoryArgs(args, spec, positionalArgs);
			const node = createNode(name, inputs, config as Record<string, ConfigValue>);
			getBuilder().addNode(node);
			return wrap(node);
		}) as DeviceFactory;
	} else {
		// Named device: creates node and registers with builder
		factory = ((...args: unknown[]) => {
			const { inputs, config } = parseFactoryArgs(args, spec, positionalArgs);
			const result = createDeviceNode(name, spec, inputs, config as Record<string, ConfigValue>);
			return wrap(result);
		}) as DeviceFactory;
	}

	registerDevice(name, factory, spec);

	return factory;
}

export type DeviceFactory = ((...args: unknown[]) => WrappedNode) & { spec: DeviceSpec };

function parseFactoryArgs(
	args: unknown[],
	spec: DeviceSpec,
	positionalArgs: readonly string[],
): { inputs: Record<string, NodeInput>; config: Record<string, unknown> } {
	const inputs: Record<string, NodeInput> = {};
	// Start with spec defaults, then override with user-provided values
	const config: Record<string, unknown> = { ...spec.config };

	let positionalIndex = 0;

	for (const arg of args) {
		if (isParamsObject(arg)) {
			// Object params - distribute to inputs/config
			for (const [key, value] of Object.entries(arg)) {
				if (key in spec.inputs) {
					inputs[key] = normalizeSignal(value);
				} else if (key in spec.config) {
					config[key] = value;
				}
			}
		} else if (positionalIndex < positionalArgs.length) {
			// Positional arg - check if it's an input or config
			const paramName = positionalArgs[positionalIndex]!;
			if (paramName in spec.inputs) {
				inputs[paramName] = normalizeSignal(arg);
			} else if (paramName in spec.config) {
				config[paramName] = arg;
			}
			positionalIndex++;
		} else if (positionalIndex === 0 && positionalArgs.length === 0) {
			// No positional args defined, use default input
			inputs[spec.defaultInput] = normalizeSignal(arg);
			positionalIndex++;
		}
	}

	return { inputs, config };
}

function isParamsObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value) && !isOutputRef(value);
}

function isOutputRef(value: unknown): boolean {
	return typeof value === "object" && value !== null && "ref" in value && "out" in value;
}
