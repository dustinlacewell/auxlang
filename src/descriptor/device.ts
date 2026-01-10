import { isPlainParamsObject } from "./guards/is-params-object";
import { isSignalArray } from "./guards/is-signal-array";
import { createDescriptorId } from "./identity";
import { poly, type PolyDescriptor } from "./poly";
import { createChainableOutput } from "./proxy/chainable-output";
import { getOutputHandler, registerDescriptor, registerDevice } from "./registry";
import type {
	AnyDescriptor,
	ConfigDef,
	ConfigValue,
	Descriptor,
	DescriptorState,
	DeviceSpec,
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
		registerDevice(name, (inputSignal?: Signal | Record<string, Signal>) => {
			if (inputSignal === undefined) {
				return createDescriptor(spec, {}, {});
			}
			// Check if it's a plain params object with input names as keys
			if (
				typeof inputSignal === "object" &&
				inputSignal !== null &&
				!Array.isArray(inputSignal) &&
				!("_state" in inputSignal) &&
				!("_feedback" in inputSignal) &&
				!("descriptorId" in inputSignal)
			) {
				// Check if any keys match input names - if so, treat as params object
				const inputNames = Object.keys(spec.inputs);
				const signalKeys = Object.keys(inputSignal);
				const hasInputKey = signalKeys.some((k) => inputNames.includes(k));
				if (hasInputKey) {
					// It's a params object like { a: signal, b: signal }
					return createDescriptor(spec, inputSignal as Record<string, Signal>, {});
				}
			}
			// Single signal goes to default input
			return createDescriptor(spec, { [spec.defaultInput]: inputSignal as Signal }, {});
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
): AnyDescriptor | PolyDescriptor {
	const id = createDescriptorId();

	// Check for array inputs - expand to poly
	for (const [key, value] of Object.entries(inputBindings)) {
		if (isSignalArray(value)) {
			const voices = value.map((v) =>
				createDescriptor(spec, { ...inputBindings, [key]: v }, configBindings),
			) as AnyDescriptor[];
			return poly(voices);
		}
	}

	const state: DescriptorState = {
		id,
		spec,
		inputBindings: inputBindings,
		configBindings,
	};

	const callable = (value: Signal | Record<string, Signal>): AnyDescriptor | PolyDescriptor => {
		// Check if called with params object like { a: signal, b: signal }
		if (isPlainParamsObject(value)) {
			const inputNames = Object.keys(spec.inputs);
			const signalKeys = Object.keys(value);
			const hasInputKey = signalKeys.some((k) => inputNames.includes(k));
			if (hasInputKey) {
				// Merge params into existing bindings
				return createDescriptor(spec, { ...inputBindings, ...value }, configBindings);
			}
		}
		// Single signal goes to default input
		return createDescriptor(spec, { ...inputBindings, [spec.defaultInput]: value as Signal }, configBindings);
	};

	const descriptor = new Proxy(callable as AnyDescriptor, {
		get(target, prop: string | symbol): unknown {
			if (prop === "_state") return state;

			if (typeof prop === "symbol") return undefined;

			// Signal input setter (takes priority)
			if (prop in spec.inputs) {
				return (value: Signal): AnyDescriptor | PolyDescriptor => {
					return createDescriptor(spec, { ...inputBindings, [prop]: value }, configBindings);
				};
			}

			// Config setter
			if (prop in spec.config) {
				return (value: ConfigValue): AnyDescriptor | PolyDescriptor => {
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

			// .apply(fn) - call fn with this descriptor and return the result
			// Allows inline variable binding: clock(120).apply(c => seq("...", { clk: c }).saw())
			if (prop === "apply") {
				return <T>(fn: (d: AnyDescriptor) => T): T => fn(descriptor);
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
