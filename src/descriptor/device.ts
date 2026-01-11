import { isOutputRef } from "./guards/is-output-ref";
import { isPlainParamsObject } from "./guards/is-params-object";
import { isSignalArray } from "./guards/is-signal-array";
import { isDescriptor } from "./guards/is-descriptor";
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
	ProcessAllFn,
	ProcessFn,
	Signal,
} from "./types";


/** Expand function - runs at construction time to replace device with other descriptors */
export type ExpandFn = (
	config: Record<string, ConfigValue>,
	inputBindings: Record<string, Signal>,
) => AnyDescriptor | PolyDescriptor;

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
	/** Positional args order - consumed in sequence until object or end */
	readonly positionalArgs?: readonly (I | C)[];
	/** Expand function - replaces this device with other descriptors at construction */
	readonly expand?: ExpandFn;
	/** If true, device receives all poly voices instead of being expanded per-voice */
	readonly polyphonic?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: processAll functions have device-specific typed signatures
	/** Process function for polyphonic devices - receives arrays for poly inputs */
	readonly processAll?: ProcessAllFn<any, any, any>;
}

/** Extract config keys from an input object, defaulting to never if no config */
type ConfigKeys<T> = T extends { config: Record<infer K, ConfigValue> } ? K : never;

// biome-ignore lint/suspicious/noExplicitAny: process functions have device-specific typed signatures
type AnyProcessFn = ProcessFn<any, any, any>;

// Dummy no-op process for WASM devices (never called, WASM handles processing)
const wasmNoopProcess: AnyProcessFn = () => ({});

// biome-ignore lint/suspicious/noExplicitAny: processAll functions have device-specific typed signatures
type AnyProcessAllFn = ProcessAllFn<any, any, any>;

/** Device spec type for overload signatures */
type DeviceSpecInput = {
	inputs: Record<string, { default: number | number[] }>;
	config?: Record<string, ConfigValue>;
	outputs: readonly string[];
	defaultInput: string;
	defaultOutput: string;
	process?: AnyProcessFn;
	wasmUrl?: string;
	positionalArgs?: readonly string[];
	expand?: ExpandFn;
	polyphonic?: boolean;
	processAll?: AnyProcessAllFn;
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
		...(input.polyphonic ? { polyphonic: true } : {}),
		...(input.processAll ? {
			processAll: input.processAll,
			processAllSource: input.processAll.toString(),
		} : {}),
	};

	const positionalArgs = input.positionalArgs ?? [input.defaultInput];
	const expandFn = input.expand;
	const inputNames = Object.keys(spec.inputs);
	const configNames = Object.keys(spec.config);

	// Factory function that handles positional args and expand
	// When chained (e.g., clock.seq("pattern")), first arg is an OutputRef/Descriptor
	// When called directly (e.g., seq("pattern")), first arg is a positional arg
	const factory = (firstArg?: unknown, ...restArgs: unknown[]) => {
		const inputBindings: Record<string, Signal> = {};
		const configBindings: Record<string, ConfigValue> = {};

		// Detect if we're being chained: first arg is OutputRef or Descriptor
		const isChained = firstArg !== undefined &&
			(isOutputRef(firstArg) || isDescriptor(firstArg));

		// Collect args to consume via positionalArgs
		const argsToConsume: unknown[] = isChained ? restArgs :
			(firstArg !== undefined ? [firstArg, ...restArgs] : []);

		// If chained, the chained signal goes directly to defaultInput
		if (isChained) {
			inputBindings[spec.defaultInput] = firstArg as Signal;
		}

		// Consume argsToConsume via positionalArgs order
		// If chained, skip defaultInput in positionalArgs (it's already bound)
		let argIndex = 0;
		for (const paramName of positionalArgs) {
			// Skip defaultInput if we're chained (it's already in inputBindings)
			if (isChained && paramName === spec.defaultInput) {
				continue;
			}

			if (argIndex >= argsToConsume.length) break;
			const arg = argsToConsume[argIndex];

			// If we hit an object, stop positional consumption
			if (isPlainParamsObject(arg)) break;

			const isInput = inputNames.includes(paramName);
			const isConfig = configNames.includes(paramName);

			if (isInput) {
				inputBindings[paramName] = arg as Signal;
			} else if (isConfig) {
				configBindings[paramName] = arg as ConfigValue;
			}
			argIndex++;
		}

		// If last arg is a params object, merge it
		const lastArg = argsToConsume[argsToConsume.length - 1];
		if (argsToConsume.length > 0 && isPlainParamsObject(lastArg)) {
			const params = lastArg as Record<string, unknown>;
			for (const [key, value] of Object.entries(params)) {
				if (inputNames.includes(key)) {
					inputBindings[key] = value as Signal;
				} else if (configNames.includes(key)) {
					configBindings[key] = value as ConfigValue;
				}
			}
		}

		// If expand function provided, use it instead of creating normal descriptor
		if (expandFn) {
			// Merge config defaults with bindings
			const fullConfig: Record<string, ConfigValue> = {};
			for (const [key, def] of Object.entries(spec.config)) {
				fullConfig[key] = configBindings[key] ?? def.default;
			}
			const result = expandFn(fullConfig, inputBindings);
			// Apply any remaining input bindings to the expanded result
			let finalResult = result;
			for (const [key, value] of Object.entries(inputBindings)) {
				if (key in spec.inputs && typeof (finalResult as any)[key] === "function") {
					finalResult = (finalResult as any)[key](value);
				}
			}
			return finalResult;
		}

		return createDescriptor(spec, inputBindings, configBindings);
	};

	// Register device factory if name provided
	if (name) {
		registerDevice(name, factory, spec);
	}

	// For devices with expand, return the factory function directly
	// For regular devices, return a base descriptor
	if (expandFn) {
		// Cast is safe: factory returns the correct runtime shape
		return factory as unknown as Descriptor<
			keyof T["inputs"] & string,
			ConfigKeys<T> & string,
			T["outputs"][number]
		>;
	}

	// Create the base descriptor for regular devices
	const baseDescriptor = createDescriptor(spec, {}, {});

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
