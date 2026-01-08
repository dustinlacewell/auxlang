import { createDescriptorId } from "./identity";
import { registerDescriptor } from "./registry";
import type {
	AnyDescriptor,
	ConfigDef,
	ConfigValue,
	Descriptor,
	DescriptorId,
	DescriptorState,
	DeviceSpec,
	OutputRef,
	ProcessFn,
	Signal,
} from "./types";

/** Input to device() - process is a function, processSource is auto-generated */
export interface DeviceInput<
	I extends string,
	C extends string,
	O extends string,
> {
	readonly inputs: Record<I, { default: number | number[] }>;
	readonly config?: Record<C, ConfigValue>;
	readonly outputs: readonly O[];
	readonly defaultInput: I;
	readonly defaultOutput: O;
	// biome-ignore lint/suspicious/noExplicitAny: process functions have device-specific typed signatures
	readonly process?: ProcessFn<any, any, any>;
	/** URL to WASM module - if provided, process is optional */
	readonly wasmUrl?: string;
}

/** Extract config keys from an input object, defaulting to never if no config */
type ConfigKeys<T> = T extends { config: Record<infer K, ConfigValue> } ? K : never;

// biome-ignore lint/suspicious/noExplicitAny: process functions have device-specific typed signatures
type AnyProcessFn = ProcessFn<any, any, any>;

// Dummy no-op process for WASM devices (never called, WASM handles processing)
const wasmNoopProcess: AnyProcessFn = () => ({});

export function device<
	const T extends {
		inputs: Record<string, { default: number | number[] }>;
		config?: Record<string, ConfigValue>;
		outputs: readonly string[];
		defaultInput: string;
		defaultOutput: string;
		process?: AnyProcessFn;
		wasmUrl?: string;
	},
>(
	input: T,
): Descriptor<
	keyof T["inputs"] & string,
	ConfigKeys<T> & string,
	T["outputs"][number]
> {
	// Convert config values to ConfigDef format
	const configDefs: Record<string, ConfigDef> = {};
	if (input.config) {
		for (const [name, fn] of Object.entries(input.config)) {
			configDefs[name] = { default: fn };
		}
	}

	// Use provided process or no-op for WASM devices
	const process = input.process ?? wasmNoopProcess;

	const spec: DeviceSpec = {
		inputs: input.inputs,
		config: configDefs,
		outputs: input.outputs,
		defaultInput: input.defaultInput,
		defaultOutput: input.defaultOutput,
		process,
		processSource: process.toString(),
		...(input.wasmUrl ? { wasmUrl: input.wasmUrl } : {}),
	};
	// Cast is safe: createDescriptor returns the correct runtime shape,
	// and device() ensures the type parameters match the spec
	return createDescriptor(spec, {}, {}) as Descriptor<
		keyof T["inputs"] & string,
		ConfigKeys<T> & string,
		T["outputs"][number]
	>;
}

function createDescriptor(
	spec: DeviceSpec,
	inputBindings: Record<string, Signal>,
	configBindings: Record<string, ConfigValue>,
): AnyDescriptor {
	const id = createDescriptorId();

	const state: DescriptorState = {
		id,
		spec,
		inputBindings,
		configBindings,
	};

	const callable = (value: Signal): AnyDescriptor => {
		return createDescriptor(
			spec,
			{ ...inputBindings, [spec.defaultInput]: value },
			configBindings,
		);
	};

	const descriptor = new Proxy(callable as AnyDescriptor, {
		get(target, prop: string | symbol): unknown {
			if (prop === "_state") return state;

			if (typeof prop === "symbol") return undefined;

			if (spec.outputs.includes(prop)) {
				return createOutputRef(id, prop);
			}

			// Signal input setter
			if (prop in spec.inputs) {
				return (value: Signal): AnyDescriptor => {
					return createDescriptor(
						spec,
						{ ...inputBindings, [prop]: value },
						configBindings,
					);
				};
			}

			// Config setter
			if (prop in spec.config) {
				return (value: ConfigValue): AnyDescriptor => {
					return createDescriptor(spec, inputBindings, {
						...configBindings,
						[prop]: value,
					});
				};
			}

			return undefined;
		},
	});

	registerDescriptor(descriptor);
	return descriptor;
}

function createOutputRef(descriptorId: DescriptorId, outputName: string): OutputRef {
	return { descriptorId, outputName };
}
