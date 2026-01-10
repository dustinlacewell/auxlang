/**
 * Poly descriptor - wraps multiple mono descriptors for polyphonic signals.
 *
 * Poly propagates through method chaining (D074). When you call a method on
 * a poly, it forwards to each voice and returns a new poly. This continues
 * until you call `.voices` to unpack or `.out()` to sum.
 *
 * Example:
 *   seq("{c4,e4}").saw().lpf(800)
 *   // Creates poly of 2 seqs, then poly of 2 saws, then poly of 2 lpfs
 */

import { isDescriptor } from "./is-descriptor";
import { isPlainParamsObject } from "./is-params-object";
import { getDeviceFactory, getOutputHandler } from "./registry";
import type { AnyDescriptor, OutputRef, Signal } from "./types";

/** A poly descriptor wrapping N mono descriptors */
export interface PolyDescriptor {
	readonly _poly: true;
	readonly voices: readonly AnyDescriptor[];
}

/** Type guard for poly descriptors */
export function isPoly(value: unknown): value is PolyDescriptor {
	// Poly uses a function as proxy target (for `apply` support), so check both
	if (value === null || value === undefined) return false;
	if (typeof value !== "object" && typeof value !== "function") return false;
	return "_poly" in value && (value as PolyDescriptor)._poly === true;
}

/** Poly output ref - references outputs from all voices */
export interface PolyOutputRef {
	readonly _polyOutputs: readonly OutputRef[];
}

/** Type guard for poly output refs */
export function isPolyOutputRef(value: unknown): value is PolyOutputRef {
	return (
		typeof value === "object" &&
		value !== null &&
		"_polyOutputs" in value &&
		Array.isArray((value as PolyOutputRef)._polyOutputs)
	);
}

/**
 * Create a chainable PolyOutputRef.
 * When you call .saw() on it, creates a saw for each voice output and returns a new poly.
 */
function createChainablePolyOutputRef(outputRefs: OutputRef[]): PolyOutputRef {
	const ref: PolyOutputRef = { _polyOutputs: outputRefs };

	return new Proxy(ref, {
		get(target, prop) {
			if (prop === "_polyOutputs") return target._polyOutputs;

			// .out() - terminal output registration
			// PolyOutputRef can't register directly - must first chain to a device
			if (prop === "out") {
				return () => {
					throw new Error("Cannot call .out() on output ref - chain to a device first");
				};
			}

			// Uzu chaining: look up device by name
			if (typeof prop === "string") {
				const deviceFactory = getDeviceFactory(prop);
				if (deviceFactory) {
					return (params?: Record<string, Signal | PolyDescriptor> | Signal): PolyDescriptor => {
						const newVoices = outputRefs.map((outputRef, _voiceIndex) => {
							const device = deviceFactory(outputRef);

							// No params - just return device
							if (params === undefined) {
								return device;
							}

							// Plain object params - apply each as a setter
							if (isPlainParamsObject(params)) {
								let result = device;
								for (const [key, value] of Object.entries(params)) {
									const setter = (result as unknown as Record<string, (v: Signal) => AnyDescriptor>)[key];
									if (typeof setter === "function") {
										// Distribute arrays/polys; broadcast scalars
										let resolvedValue: Signal;
										if (Array.isArray(value)) {
											resolvedValue = value[_voiceIndex % value.length]!;
										} else if (isPoly(value)) {
											resolvedValue = value.voices[_voiceIndex % value.voices.length] as Signal;
										} else {
											resolvedValue = value as Signal;
										}
										result = setter(resolvedValue);
									}
								}
								return result;
							}

							// Bare signal (lambda, number, etc.) - apply to first non-default input
							// This enables: poly.add(x => x.delay().mult())
							if (isDescriptor(device)) {
								const spec = device._state.spec;
								const inputNames = Object.keys(spec.inputs);
								const nonDefaultInputs = inputNames.filter((name) => name !== spec.defaultInput);
								if (nonDefaultInputs.length > 0) {
									const firstNonDefault = nonDefaultInputs[0]!;
									const setter = (device as unknown as Record<string, (v: Signal) => AnyDescriptor>)[
										firstNonDefault
									];
									if (typeof setter === "function") {
										return setter(params as Signal);
									}
								}
							}

							return device;
						});
						return poly(newVoices);
					};
				}
			}

			return undefined;
		},
	});
}

/**
 * Flatten an array that may contain nested polys into a flat array of mono descriptors.
 */
function flattenVoices(items: (AnyDescriptor | PolyDescriptor)[]): AnyDescriptor[] {
	const result: AnyDescriptor[] = [];
	for (const item of items) {
		if (isPoly(item)) {
			result.push(...(item.voices as AnyDescriptor[]));
		} else {
			result.push(item);
		}
	}
	return result;
}

/**
 * Create a poly descriptor from an array of descriptors (may include nested polys).
 *
 * The returned poly forwards method calls to each voice:
 * - Input setters return new poly with each voice updated
 * - Output accessors return PolyOutputRef
 * - Callable (default input) returns new poly
 * - `.voices` returns the array for manual iteration
 */
export function poly(voicesInput: (AnyDescriptor | PolyDescriptor)[]): PolyDescriptor {
	// Flatten any nested polys
	const voices = flattenVoices(voicesInput);

	if (voices.length === 0) {
		throw new Error("poly() requires at least one voice");
	}

	// Safe because we check voices.length > 0 above
	const spec = voices[0]!._state.spec;

	const handler: ProxyHandler<{ _poly: true; voices: AnyDescriptor[] }> = {
		get(target, prop: string | symbol): unknown {
			if (prop === "_poly") return true;
			if (prop === "voices") return voices;
			if (typeof prop === "symbol") return undefined;

			// .out() - terminal output registration (registers all voices)
			if (prop === "out") {
				return () => {
					const outputHandler = getOutputHandler();
					if (outputHandler) {
						outputHandler([...voices]);
					}
				};
			}

			// .apply(fn) - call fn with this poly and return the result
			if (prop === "apply") {
				return <T>(fn: (p: PolyDescriptor) => T): T => fn(poly(voices));
			}

			// Output accessor - return chainable poly output ref
			if (spec.outputs.includes(prop)) {
				const outputRefs = voices
					.map((v) => (v as unknown as Record<string, OutputRef>)[prop])
					.filter((ref): ref is OutputRef => ref !== undefined);
				return createChainablePolyOutputRef(outputRefs);
			}

			// Input setter - forward to each voice, return new poly
			if (prop in spec.inputs) {
				return (value: Signal): PolyDescriptor => {
					const newVoices = voices.map((v, voiceIndex) => {
						const setter = (v as unknown as Record<string, (val: Signal) => AnyDescriptor>)[prop];
						// If value is array, distribute; if poly, distribute; otherwise broadcast
						let resolvedValue: Signal;
						if (Array.isArray(value)) {
							resolvedValue = value[voiceIndex % value.length]!;
						} else if (isPoly(value)) {
							resolvedValue = value.voices[voiceIndex % value.voices.length] as Signal;
						} else {
							resolvedValue = value;
						}
						return setter?.(resolvedValue) ?? v;
					});
					return poly(newVoices);
				};
			}

			// Config setter - forward to each voice, return new poly
			if (prop in spec.config) {
				return (value: unknown): PolyDescriptor => {
					const newVoices = voices.map((v) => {
						const setter = (v as unknown as Record<string, (val: unknown) => AnyDescriptor>)[prop];
						return setter?.(value) ?? v;
					});
					return poly(newVoices);
				};
			}

			// Uzu chaining: look up device by name, forward to each voice
			const deviceFactory = getDeviceFactory(prop);
			if (deviceFactory) {
				return (params?: Record<string, Signal | PolyDescriptor> | Signal): PolyDescriptor => {
					const newVoices = voices.map((v, _voiceIndex) => {
						// Get the default output from each voice and chain to new device
						const outputRef = (v as unknown as Record<string, OutputRef>)[spec.defaultOutput];
						const device = deviceFactory(outputRef);

						// No params - just return device
						if (params === undefined) {
							return device;
						}

						// Plain object params - apply each as a setter
						if (isPlainParamsObject(params)) {
							let result = device;
							for (const [key, value] of Object.entries(params)) {
								const setter = (result as unknown as Record<string, (val: Signal) => AnyDescriptor>)[key];
								if (typeof setter === "function") {
									// Distribute arrays/polys; broadcast scalars
									let resolvedValue: Signal;
									if (Array.isArray(value)) {
										resolvedValue = value[_voiceIndex % value.length]!;
									} else if (isPoly(value)) {
										resolvedValue = value.voices[_voiceIndex % value.voices.length] as Signal;
									} else {
										resolvedValue = value as Signal;
									}
									result = setter(resolvedValue);
								}
							}
							return result;
						}

						// Bare signal (lambda, number, etc.) - apply to first non-default input
						// This enables: poly.add(x => x.delay().mult())
						if (isDescriptor(device)) {
							const deviceSpec = device._state.spec;
							const inputNames = Object.keys(deviceSpec.inputs);
							const nonDefaultInputs = inputNames.filter((name) => name !== deviceSpec.defaultInput);
							if (nonDefaultInputs.length > 0) {
								const firstNonDefault = nonDefaultInputs[0]!;
								const setter = (device as unknown as Record<string, (v: Signal) => AnyDescriptor>)[
									firstNonDefault
								];
								if (typeof setter === "function") {
									return setter(params as Signal);
								}
							}
						}

						return device;
					});
					return poly(newVoices);
				};
			}

			return undefined;
		},

		// Make poly callable - sets default input on each voice
		apply(target, thisArg, args: [Signal]): PolyDescriptor {
			const [value] = args;
			const newVoices = voices.map((v, voiceIndex) => {
				const callable = v as unknown as (val: Signal) => AnyDescriptor;
				// If value is array, distribute; if poly, distribute; otherwise broadcast
				let resolvedValue: Signal;
				if (Array.isArray(value)) {
					resolvedValue = value[voiceIndex % value.length]!;
				} else if (isPoly(value)) {
					resolvedValue = value.voices[voiceIndex % value.voices.length] as Signal;
				} else {
					resolvedValue = value;
				}
				return callable(resolvedValue);
			});
			return poly(newVoices);
		},
	};

	// Need to use a function as the proxy target for `apply` to work
	const callable = (() => {}) as unknown as { _poly: true; voices: AnyDescriptor[] };
	callable._poly = true;
	callable.voices = voices;

	return new Proxy(callable, handler) as unknown as PolyDescriptor;
}

/**
 * Get voice count from a signal source.
 */
export function getVoiceCount(source: AnyDescriptor | PolyDescriptor): number {
	if (isPoly(source)) {
		return source.voices.length;
	}
	return 1;
}

/**
 * Get individual voices from a signal source.
 */
export function getVoices(source: AnyDescriptor | PolyDescriptor): AnyDescriptor[] {
	if (isPoly(source)) {
		return [...source.voices];
	}
	return [source as AnyDescriptor];
}
