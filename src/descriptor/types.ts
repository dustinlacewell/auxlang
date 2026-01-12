/**
 * Core types for the descriptor system.
 *
 * A descriptor is a lazy specification of a device instance.
 * Descriptors form a DAG that is only reified when connected to out().
 */

/** Unique identifier for a descriptor instance */
export type DescriptorId = string & { readonly brand: unique symbol };

/**
 * A lambda function that generates a signal value per-sample.
 * Receives persistent state, sample rate, and time in seconds since eval started.
 */
export type SignalLambda = (
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
) => number;

/**
 * A signal source that can be passed to device inputs (user-facing).
 *
 * - number: constant value
 * - number[]: array for per-voice distribution
 * - OutputRef: explicit reference to a descriptor's output
 * - AnyDescriptor: shorthand for the descriptor's default output (normalized to OutputRef at binding)
 * - SignalLambda: inline per-sample function
 * - PolyDescriptor: polyphonic signal (for polyphonic devices)
 */
export type Signal = number | number[] | OutputRef | AnyDescriptor | SignalLambda | PolyDescriptor;

/**
 * Normalized signal - what gets stored in inputBindings after binding.
 * Descriptors are converted to OutputRefs at binding time.
 */
export type BoundSignal = number | number[] | OutputRef | SignalLambda | BoundPoly;

/** Poly with normalized voices (any signal type, normalized at binding time) */
export interface BoundPoly {
	readonly _poly: true;
	readonly voices: readonly BoundSignal[];
}

/** Forward declaration for PolyDescriptor (defined in poly.ts) */
export interface PolyDescriptor {
	readonly _poly: true;
	readonly voices: readonly Signal[];
}

/** Reference to a specific output of a descriptor */
export interface OutputRef {
	readonly descriptorId: DescriptorId;
	readonly outputName: string;
}

/** Input definition for a device - modulatable signals */
export interface InputDef {
	readonly default: number | number[];
}

/** Config definition for a device - functions called internally */
export interface ConfigDef {
	readonly default: ConfigValue;
}

/** A config value - either plain JSON data or a function */
// biome-ignore lint/suspicious/noExplicitAny: config values have arbitrary types
export type ConfigValue = ConfigData | ConfigFunction;
export type ConfigData = number | string | boolean | number[] | string[] | Record<string, unknown>;
// biome-ignore lint/suspicious/noExplicitAny: config functions have arbitrary signatures
export type ConfigFunction = (...args: any[]) => any;

/** Device specification - the blueprint for creating descriptors */
export interface DeviceSpec {
	readonly inputs: Record<string, InputDef>;
	readonly config: Record<string, ConfigDef>;
	readonly outputs: readonly string[];
	readonly defaultInput: string;
	readonly defaultOutput: string;
	/** Order of positional arguments for the factory */
	readonly positionalArgs: readonly string[];
	readonly process: ProcessFn;
	readonly processSource: string;
	/** URL to WASM module for native devices */
	readonly wasmUrl?: string;
	/** If true, device receives all poly voices instead of being expanded per-voice */
	readonly polyphonic?: boolean;
	/** Process function for polyphonic devices - receives arrays for poly inputs */
	readonly processAll?: ProcessAllFn;
	readonly processAllSource?: string;
}

/**
 * Runtime process function signature.
 *
 * The generic parameters allow device authors to specify exact shapes:
 * - I: input names (e.g., { freq: number; amp: number })
 * - C: config names (e.g., { shape: ConfigValue })
 * - O: output names (e.g., { out: number })
 *
 * At runtime, all inputs and config are guaranteed to have values (defaults applied).
 */
export type ProcessFn<
	I extends Record<string, number> = Record<string, number>,
	C extends Record<string, ConfigValue> = Record<string, ConfigValue>,
	O extends Record<string, number> = Record<string, number>,
> = (inputs: I, config: C, state: Record<string, unknown>, sampleRate: number, time: number) => O;

/**
 * Process function for polyphonic devices.
 * Poly inputs are passed as number arrays, mono inputs as single numbers.
 */
export type ProcessAllFn<
	I extends Record<string, number | number[]> = Record<string, number | number[]>,
	C extends Record<string, ConfigValue> = Record<string, ConfigValue>,
	O extends Record<string, number> = Record<string, number>,
> = (inputs: I, config: C, state: Record<string, unknown>, sampleRate: number, time: number) => O;

/** The internal state of a descriptor */
export interface DescriptorState {
	readonly id: DescriptorId;
	readonly spec: DeviceSpec;
	readonly inputBindings: Record<string, BoundSignal>;
	readonly configBindings: Record<string, ConfigValue>;
}

/**
 * A Descriptor is a proxy that represents a lazy device instance.
 *
 * Type parameters:
 * - I: input names as keys (e.g., "freq" | "amp")
 * - C: config names as keys (e.g., "shape")
 * - O: output names as keys (e.g., "out")
 *
 * Key behaviors:
 * - Calling it sets the default input: saw(440) = saw.pitch(440)
 * - Chaining returns a NEW descriptor: lfo.rate(4) !== lfo
 * - Property access for inputs returns a setter method
 * - Property access for outputs returns an OutputRef
 */
export type Descriptor<
	I extends string = string,
	C extends string = string,
	O extends string = string,
> = {
	readonly _state: DescriptorState;
	/** Call to set default input, returns new descriptor */
	(value: Signal): Descriptor<I, C, O>;
} & InputSetters<I, C, O> &
	ConfigSetters<I, C, O> &
	OutputRefs<O>;

/** Input setter methods - each returns a new Descriptor */
type InputSetters<I extends string, C extends string, O extends string> = {
	[K in I]: (value: Signal) => Descriptor<I, C, O>;
};

/** Config setter methods - each returns a new Descriptor */
type ConfigSetters<I extends string, C extends string, O extends string> = {
	[K in C]: (value: ConfigValue) => Descriptor<I, C, O>;
};

/** Output property accessors - each returns an OutputRef */
type OutputRefs<O extends string> = {
	readonly [K in O]: OutputRef;
};

/**
 * Base descriptor type for internal use when generics aren't known.
 * Uses the minimal interface that all descriptors share.
 */
export interface AnyDescriptor {
	readonly _state: DescriptorState;
	(value: Signal): AnyDescriptor;
}
