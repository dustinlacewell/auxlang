import { createDescriptorId } from "./identity";
import { getDeviceFactory, getOutputHandler, registerDescriptor, registerDevice } from "./registry";
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
export interface DeviceInput<I extends string, C extends string, O extends string> {
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

/** Device spec type for overload signatures */
type DeviceSpecInput = {
	inputs: Record<string, { default: number | number[] }>;
	config?: Record<string, ConfigValue>;
	outputs: readonly string[];
	defaultInput: string;
	defaultOutput: string;
	process?: AnyProcessFn;
	wasmUrl?: string;
};

/**
 * Create a device with a name (registers for Uzu chaining).
 * @example device('saw', { inputs: { freq: 440 }, ... })
 */
export function device<const T extends DeviceSpecInput>(
	name: string,
	spec: T,
): Descriptor<keyof T["inputs"] & string, ConfigKeys<T> & string, T["outputs"][number]>;

/**
 * Create an anonymous device (not registered for chaining).
 * @example device({ inputs: { freq: 440 }, ... })
 */
export function device<const T extends DeviceSpecInput>(
	spec: T,
): Descriptor<keyof T["inputs"] & string, ConfigKeys<T> & string, T["outputs"][number]>;

export function device<const T extends DeviceSpecInput>(
	nameOrSpec: string | T,
	maybeSpec?: T,
): Descriptor<keyof T["inputs"] & string, ConfigKeys<T> & string, T["outputs"][number]> {
	const name = typeof nameOrSpec === "string" ? nameOrSpec : undefined;
	const input = typeof nameOrSpec === "string" ? maybeSpec! : nameOrSpec;

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

	// Create the base descriptor
	const baseDescriptor = createDescriptor(spec, {}, {});

	// Register device factory if name provided
	if (name) {
		registerDevice(name, (inputSignal?: Signal) => {
			if (inputSignal !== undefined) {
				return createDescriptor(spec, { [spec.defaultInput]: inputSignal }, {});
			}
			return createDescriptor(spec, {}, {});
		});
	}

	// Cast is safe: createDescriptor returns the correct runtime shape,
	// and device() ensures the type parameters match the spec
	return baseDescriptor as Descriptor<
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
		return createDescriptor(spec, { ...inputBindings, [spec.defaultInput]: value }, configBindings);
	};

	const descriptor = new Proxy(callable as AnyDescriptor, {
		get(target, prop: string | symbol): unknown {
			if (prop === "_state") return state;

			if (typeof prop === "symbol") return undefined;

			// Signal input setter (takes priority)
			if (prop in spec.inputs) {
				return (value: Signal): AnyDescriptor => {
					return createDescriptor(spec, { ...inputBindings, [prop]: value }, configBindings);
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

			// .out() - terminal output registration
			// Only if "out" is NOT an actual output name on this device
			if (prop === "out" && !spec.outputs.includes("out")) {
				return () => {
					const handler = getOutputHandler();
					if (handler) {
						handler(descriptor);
					}
				};
			}

			// Everything else: return a ChainableOutput
			// - As a value, it's an OutputRef { descriptorId, outputName }
			// - When called, it chains a device (looked up from registry)
			// - Output name validity is checked at reify time, not here
			return createChainableOutput(id, spec.defaultOutput, prop);
		},
	});

	registerDescriptor(descriptor);
	return descriptor;
}

/**
 * Create a ChainableOutput - an OutputRef that's also callable for device chaining.
 *
 * @param descriptorId - The source descriptor's ID
 * @param defaultOutput - The source descriptor's default output (used when this is called)
 * @param outputName - The output name being accessed (may or may not be valid - checked at reify)
 *
 * Behavior:
 * - As a value: acts as OutputRef { descriptorId, outputName }
 * - When called: looks up device in registry, chains using defaultOutput
 * - Property access: returns another ChainableOutput for further chaining
 */
function createChainableOutput(
	descriptorId: DescriptorId,
	defaultOutput: string,
	outputName: string,
): OutputRef {
	// The callable function - when invoked, chain a device
	const callable = (params?: Record<string, Signal>): AnyDescriptor => {
		const deviceFactory = getDeviceFactory(outputName);
		if (!deviceFactory) {
			throw new Error(`"${outputName}" is not a registered device`);
		}
		// Use the default output of the source descriptor
		const sourceRef: OutputRef = { descriptorId, outputName: defaultOutput };
		const device = deviceFactory(sourceRef);
		// Apply additional params if provided
		if (params) {
			let result = device;
			for (const [key, value] of Object.entries(params)) {
				const setter = (result as unknown as Record<string, (v: Signal) => AnyDescriptor>)[key];
				if (typeof setter === "function") {
					result = setter(value);
				}
			}
			return result;
		}
		return device;
	};

	// Proxy to make it both an OutputRef and chainable
	return new Proxy(callable as unknown as OutputRef, {
		get(target, prop) {
			// Return OutputRef properties - this makes it usable as a signal input
			if (prop === "descriptorId") return descriptorId;
			if (prop === "outputName") return outputName;

			// .out() on ChainableOutput - error, need to chain to a device first
			if (prop === "out") {
				return () => {
					throw new Error("Cannot call .out() on output ref - chain to a device first");
				};
			}

			// Property access returns another ChainableOutput for chaining
			// e.g., s.cv.saw() - accessing 'saw' on the cv output
			if (typeof prop === "string") {
				// This ChainableOutput represents the explicit output (outputName),
				// so when chaining from it, we use outputName as the source output
				return createChainableOutput(descriptorId, outputName, prop);
			}

			return undefined;
		},
	});
}
