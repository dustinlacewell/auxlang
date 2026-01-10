import { createDescriptorId } from "./identity";
import { isDescriptor } from "./is-descriptor";
import { isOutputRef } from "./is-output-ref";
import { isPlainParamsObject } from "./is-params-object";
import { poly, type PolyDescriptor } from "./poly";
import { getDeviceFactory, getOutputHandler, registerDescriptor, registerDevice } from "./registry";
import type {
	AnyDescriptor,
	ConfigDef,
	ConfigValue,
	Descriptor,
	DescriptorId,
	DescriptorState,
	DeviceSpec,
	FeedbackRef,
	OutputRef,
	ProcessFn,
	Signal,
} from "./types";

/**
 * Check if a value is a signal array that should expand to polyphony.
 * Any array passed as an input triggers poly expansion.
 */
function isSignalArray(value: unknown): value is Signal[] {
	return Array.isArray(value) && value.length > 0;
}

/** Type for lambda inputs that create feedback loops */
type FeedbackLambda = (ref: FeedbackRef) => Signal | AnyDescriptor;

/**
 * Check if a value is a feedback lambda function.
 * Lambda inputs are plain functions (not OutputRef or Descriptor proxies).
 * OutputRef and Descriptor are both callable proxies, but they have
 * identifying properties that distinguish them from plain functions.
 */
function isFeedbackLambda(value: unknown): value is FeedbackLambda {
	if (typeof value !== "function") return false;
	// OutputRef proxies have descriptorId property
	if (isOutputRef(value)) return false;
	// Descriptor proxies have _state property
	if (isDescriptor(value)) return false;
	return true;
}

/**
 * Create a chainable FeedbackRef proxy.
 * This is passed to lambda inputs and represents "the output of the node being built".
 *
 * The proxy:
 * - Acts as a FeedbackRef (has _feedback, targetId, outputName)
 * - Supports Uzu chaining: ref.delay(0.1).mult(0.8)
 * - Returns descriptors that contain the feedback reference in their input chain
 */
function createFeedbackProxy(targetId: DescriptorId, defaultOutput: string): FeedbackRef {
	const feedbackRef: FeedbackRef = {
		_feedback: true,
		targetId,
		outputName: defaultOutput,
	};

	return new Proxy(feedbackRef, {
		get(target, prop) {
			// Return FeedbackRef properties
			if (prop === "_feedback") return true;
			if (prop === "targetId") return targetId;
			if (prop === "outputName") return defaultOutput;

			// Uzu chaining: look up device by name
			if (typeof prop === "string") {
				const deviceFactory = getDeviceFactory(prop);
				if (deviceFactory) {
					// Chain to device, passing the feedback ref as input
					return (params?: Record<string, Signal>): AnyDescriptor | PolyDescriptor => {
						const device = deviceFactory(feedbackRef as unknown as Signal);
						if (params) {
							let result: AnyDescriptor | PolyDescriptor = device;
							for (const [key, value] of Object.entries(params)) {
								const setter = (result as unknown as Record<string, (v: Signal) => AnyDescriptor | PolyDescriptor>)[key];
								if (typeof setter === "function") {
									result = setter(value);
								}
							}
							return result;
						}
						return device;
					};
				}
				// Property access for specific output - return new FeedbackRef with that output
				return createFeedbackProxy(targetId, prop);
			}

			return undefined;
		},
	});
}


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
	// Generate ID first - needed for feedback proxy
	const id = createDescriptorId();

	// Resolve lambda inputs - execute them with a feedback proxy
	const resolvedBindings: Record<string, Signal> = {};
	for (const [key, value] of Object.entries(inputBindings)) {
		if (isFeedbackLambda(value)) {
			// Create feedback proxy pointing to this descriptor's output
			const feedbackProxy = createFeedbackProxy(id, spec.defaultOutput);
			// Execute lambda to get the actual signal (which contains the feedback ref)
			const result = value(feedbackProxy);
			// Result is either a Signal directly or a descriptor (use as signal)
			resolvedBindings[key] = result as Signal;
		} else {
			resolvedBindings[key] = value;
		}
	}

	// Check for array inputs - expand to poly
	for (const [key, value] of Object.entries(resolvedBindings)) {
		if (isSignalArray(value)) {
			const voices = value.map((v) =>
				createDescriptor(spec, { ...resolvedBindings, [key]: v }, configBindings),
			) as AnyDescriptor[];
			return poly(voices);
		}
	}

	const state: DescriptorState = {
		id,
		spec,
		inputBindings: resolvedBindings,
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
				return createDescriptor(spec, { ...resolvedBindings, ...value }, configBindings);
			}
		}
		// Single signal goes to default input
		return createDescriptor(spec, { ...resolvedBindings, [spec.defaultInput]: value as Signal }, configBindings);
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
	const callable = (params?: Record<string, Signal> | Signal): AnyDescriptor | PolyDescriptor => {
		const deviceFactory = getDeviceFactory(outputName);
		if (!deviceFactory) {
			throw new Error(`"${outputName}" is not a registered device`);
		}
		// Use the default output of the source descriptor
		const sourceRef: OutputRef = { descriptorId, outputName: defaultOutput };
		const device = deviceFactory(sourceRef);

		// No params - just return the device with default input connected
		if (params === undefined) {
			return device;
		}

		// Plain object params - apply each as a setter
		if (isPlainParamsObject(params)) {
			let result: AnyDescriptor | PolyDescriptor = device;
			for (const [key, value] of Object.entries(params)) {
				const setter = (result as unknown as Record<string, (v: Signal) => AnyDescriptor | PolyDescriptor>)[key];
				if (typeof setter === "function") {
					result = setter(value);
				}
			}
			return result;
		}

		// Bare signal (lambda, number, OutputRef, etc.) - find next input after default
		// This enables syntax like: sawOsc.add(x => x.delay().mult())
		// where the lambda goes to add's "to" input (the non-default input)
		if (isDescriptor(device)) {
			const spec = device._state.spec;
			const inputNames = Object.keys(spec.inputs);
			const nonDefaultInputs = inputNames.filter((name) => name !== spec.defaultInput);
			if (nonDefaultInputs.length > 0) {
				const firstNonDefault = nonDefaultInputs[0]!;
				const setter = (device as unknown as Record<string, (v: Signal) => AnyDescriptor | PolyDescriptor>)[
					firstNonDefault
				];
				if (typeof setter === "function") {
					return setter(params as Signal);
				}
			}
		}

		// No non-default inputs to apply to (or it's a poly), just return device
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
