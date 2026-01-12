import { isPlainParamsObject } from "./guards/is-params-object";
import { isSignalArray } from "./guards/is-signal-array";
import { isDescriptor } from "./guards/is-descriptor";
import { createDescriptorId } from "./identity";
import { isPoly, poly, type PolyDescriptor } from "./poly";
import { createChainableOutput } from "./proxy/chainable-output";
import { isPolyOutputRef } from "./proxy/poly-output-proxy";
import { resolveForVoice } from "./signals/resolve-for-voice";
import { getOutputHandler, registerDescriptor, registerDevice } from "./registry";
import type {
	AnyDescriptor,
	ConfigDef,
	ConfigValue,
	Descriptor,
	DescriptorState,
	DeviceSpec,
	BoundSignal,
	ProcessAllFn,
	ProcessFn,
	Signal,
} from "./types";

/**
 * Normalize a signal by converting descriptors to OutputRefs.
 * Called at binding time so reify doesn't need to handle descriptors.
 * Recursively normalizes poly voices - they can be any signal type.
 */
function normalizeSignal(signal: Signal): BoundSignal {
	if (isDescriptor(signal)) {
		return {
			descriptorId: signal._state.id,
			outputName: signal._state.spec.defaultOutput,
		};
	}

	if (isPoly(signal)) {
		// Recursively normalize each voice - voices can be any signal type
		const voices = signal.voices.map((v) => normalizeSignal(v));
		return { _poly: true, voices };
	}

	// number, number[], OutputRef, SignalLambda pass through
	return signal as BoundSignal;
}

/**
 * Normalize all signals in a bindings object.
 */
function normalizeBindings(bindings: Record<string, Signal>): Record<string, BoundSignal> {
	const result: Record<string, BoundSignal> = {};
	for (const [key, value] of Object.entries(bindings)) {
		result[key] = normalizeSignal(value);
	}
	return result;
}


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
 * Create a device alias from an existing descriptor.
 * When called, creates a fresh clone of the descriptor with overridden bindings.
 */
function createDeviceAlias(name: string, templateDescriptor: AnyDescriptor): AnyDescriptor {
	const templateState = templateDescriptor._state;
	const spec = templateState.spec;
	const templateInputBindings = templateState.inputBindings;
	const templateConfigBindings = templateState.configBindings;

	const inputNames = Object.keys(spec.inputs);
	const configNames = Object.keys(spec.config);

	// Factory function for the alias
	// Chaining is handled by ChainableOutput passing the chain source as a named param
	// Uses spec.positionalArgs from the underlying device
	const factory = (...args: unknown[]) => {
		// Start with template bindings (these are already BoundSignal, need to allow overrides as Signal)
		const inputBindings: Record<string, Signal> = { ...templateInputBindings };
		const configBindings: Record<string, ConfigValue> = { ...templateConfigBindings };

		// Consume positional args via positionalArgs order
		let argIndex = 0;
		for (const paramName of spec.positionalArgs) {
			if (argIndex >= args.length) break;
			const arg = args[argIndex];

			// If we hit a params object, stop positional consumption
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

		// Merge all params objects (there may be multiple - user's + chain source)
		for (const arg of args) {
			if (isPlainParamsObject(arg)) {
				const params = arg as Record<string, unknown>;
				for (const [key, value] of Object.entries(params)) {
					// Error if defaultInput already set (from positional or earlier params)
					if (key === spec.defaultInput && inputBindings[key] !== undefined) {
						throw new Error(
							`Cannot set "${key}" - it's already bound. ` +
							`When chaining, the chain source binds to "${key}".`
						);
					}
					if (inputNames.includes(key)) {
						inputBindings[key] = value as Signal;
					} else if (configNames.includes(key)) {
						configBindings[key] = value as ConfigValue;
					}
				}
			}
		}

		return createDescriptor(spec, inputBindings, configBindings);
	};

	// Register device factory
	registerDevice(name, factory, spec);

	// Create a base descriptor using template bindings
	const baseDescriptor = createDescriptor(spec, templateInputBindings, templateConfigBindings);

	// Wrap factory in a proxy that also acts like the base descriptor
	const descriptorFactory = new Proxy(factory, {
		apply(target, _thisArg, args) {
			return target(...args);
		},
		get(target, prop: string | symbol) {
			if (prop === "_state") {
				return (baseDescriptor as AnyDescriptor)._state;
			}
			const baseProp = (baseDescriptor as unknown as Record<string | symbol, unknown>)[prop];
			if (baseProp !== undefined) {
				return baseProp;
			}
			return (target as unknown as Record<string | symbol, unknown>)[prop];
		},
	});

	return descriptorFactory as unknown as AnyDescriptor;
}

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

/**
 * Create a device alias from an existing descriptor (registers for Uzu chaining).
 * The alias acts like the wrapped device, allowing overrides via positional args or params.
 * @example device('shh', gain(0.2)) // saw(440).shh() or saw(440).shh(0.5)
 */
export function device(name: string, descriptor: AnyDescriptor): AnyDescriptor;

export function device<const T extends DeviceSpecInput>(
	nameOrSpec: string | T,
	maybeSpec?: T | AnyDescriptor,
): Descriptor<keyof T["inputs"] & string, ConfigKeys<T> & string, T["outputs"][number]> {
	const name = typeof nameOrSpec === "string" ? nameOrSpec : undefined;

	// Check if second arg is a descriptor (alias mode)
	if (name && maybeSpec && isDescriptor(maybeSpec)) {
		return createDeviceAlias(name, maybeSpec) as Descriptor<
			keyof T["inputs"] & string,
			ConfigKeys<T> & string,
			T["outputs"][number]
		>;
	}

	const input = typeof nameOrSpec === "string" ? (maybeSpec as T) : nameOrSpec;

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
		positionalArgs: input.positionalArgs ?? [input.defaultInput],
		process,
		processSource: process.toString(),
		...(input.wasmUrl ? { wasmUrl: input.wasmUrl } : {}),
		...(input.polyphonic ? { polyphonic: true } : {}),
		...(input.processAll ? {
			processAll: input.processAll,
			processAllSource: input.processAll.toString(),
		} : {}),
	};
	const expandFn = input.expand;
	const inputNames = Object.keys(spec.inputs);
	const configNames = Object.keys(spec.config);

	// Factory function that handles positional args and params objects
	// Chaining is handled by ChainableOutput passing the chain source as a named param
	const factory = (...args: unknown[]) => {
		const inputBindings: Record<string, Signal> = {};
		const configBindings: Record<string, ConfigValue> = {};

		// Build effective positionalArgs: if defaultInput is not in positionalArgs,
		// prepend it so that lpf(audio) routes audio to input (defaultInput)
		const effectivePositionalArgs = !spec.positionalArgs.includes(spec.defaultInput)
			? [spec.defaultInput, ...spec.positionalArgs]
			: spec.positionalArgs;

		// Consume positional args via positionalArgs order
		let argIndex = 0;
		for (const paramName of effectivePositionalArgs) {
			if (argIndex >= args.length) break;
			const arg = args[argIndex];

			// If we hit a params object, stop positional consumption
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

		// Merge all params objects (there may be multiple - user's + chain source)
		// Later params override earlier ones, but error if defaultInput set twice
		for (const arg of args) {
			if (isPlainParamsObject(arg)) {
				const params = arg as Record<string, unknown>;
				for (const [key, value] of Object.entries(params)) {
					// Error if defaultInput already set (from positional or earlier params)
					if (key === spec.defaultInput && inputBindings[key] !== undefined) {
						throw new Error(
							`Cannot set "${key}" - it's already bound. ` +
							`When chaining, the chain source binds to "${key}".`
						);
					}
					if (inputNames.includes(key)) {
						inputBindings[key] = value as Signal;
					} else if (configNames.includes(key)) {
						configBindings[key] = value as ConfigValue;
					}
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
			// expand function receives all inputs and returns the expanded graph
			// No need to re-apply inputs - expand already consumed them
			return expandFn(fullConfig, inputBindings);
		}

		return createDescriptor(spec, inputBindings, configBindings);
	};

	// Register device factory if name provided
	if (name) {
		registerDevice(name, factory, spec);
	}

	// Create a base descriptor for when device is used without calling (e.g., out(saw))
	const baseDescriptor = createDescriptor(spec, {}, {});

	// Wrap factory in a proxy that also acts like the base descriptor
	// - When called: use factory (creates fresh descriptor with current ID counter)
	// - When accessed via ._state, .outputName, etc: delegate to base descriptor
	const descriptorFactory = new Proxy(factory, {
		apply(target, _thisArg, args) {
			// Always use factory - it creates fresh descriptors with correct IDs
			// Even with no args, we need a fresh descriptor (not the stale baseDescriptor)
			return target(...args);
		},
		get(target, prop: string | symbol) {
			// Delegate descriptor-like properties to base descriptor
			if (prop === "_state") {
				return (baseDescriptor as AnyDescriptor)._state;
			}
			// For output names and input setters, delegate to base descriptor
			const baseProp = (baseDescriptor as unknown as Record<string | symbol, unknown>)[prop];
			if (baseProp !== undefined) {
				return baseProp;
			}
			// For function properties (toString, etc)
			return (target as unknown as Record<string | symbol, unknown>)[prop];
		},
	});

	return descriptorFactory as unknown as Descriptor<
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

	// Check for poly-expanding inputs: arrays, Poly, or PolyOutputRef
	for (const [key, value] of Object.entries(inputBindings)) {
		// Array input - expand to poly
		if (isSignalArray(value)) {
			const voices = value.map((v) =>
				createDescriptor(spec, { ...inputBindings, [key]: v }, configBindings),
			) as AnyDescriptor[];
			return poly(voices);
		}

		// Poly input - expand to poly with distributed voices
		if (isPoly(value)) {
			const voices = value.voices.map((_, i) =>
				createDescriptor(
					spec,
					{ ...inputBindings, [key]: resolveForVoice(value, i) },
					configBindings,
				),
			) as AnyDescriptor[];
			return poly(voices);
		}

		// PolyOutputRef input - expand to poly with distributed OutputRefs
		if (isPolyOutputRef(value)) {
			const voices = value._polyOutputs.map((outputRef) =>
				createDescriptor(
					spec,
					{ ...inputBindings, [key]: outputRef },
					configBindings,
				),
			) as AnyDescriptor[];
			return poly(voices);
		}
	}

	// Normalize signals: convert descriptors to OutputRefs
	const normalizedBindings = normalizeBindings(inputBindings);

	const state: DescriptorState = {
		id,
		spec,
		inputBindings: normalizedBindings,
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
