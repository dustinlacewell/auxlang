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

import { applyBareSignal } from "./chaining/apply-bare-signal";
import { isDescriptor } from "./guards/is-descriptor";
import { isPlainParamsObject } from "./guards/is-params-object";
import { createChainablePolyOutputRef, isPolyOutputRef, type PolyOutputRef } from "./proxy/poly-output-proxy";
import { getDeviceFactory, getDeviceSpec, getOutputHandler } from "./registry";
import { resolveForVoice } from "./signals/resolve-for-voice";
import type { AnyDescriptor, OutputRef, Signal } from "./types";

// Re-export for external use
export { isPolyOutputRef, type PolyOutputRef } from "./proxy/poly-output-proxy";

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
				return createChainablePolyOutputRef(outputRefs, poly);
			}

			// Input setter - forward to each voice, return new poly
			if (prop in spec.inputs) {
				return (value: Signal): PolyDescriptor => {
					const newVoices = voices.map((v, voiceIndex) => {
						const setter = (v as unknown as Record<string, (val: Signal) => AnyDescriptor>)[prop];
						return setter?.(resolveForVoice(value, voiceIndex)) ?? v;
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
				const deviceSpec = getDeviceSpec(prop);

				// Polyphonic device: pass the poly directly instead of per-voice expansion
				if (deviceSpec?.polyphonic) {
					return (params?: Record<string, Signal | PolyDescriptor> | Signal): AnyDescriptor | PolyDescriptor => {
						// Pass the entire poly as the default input
						const thisPoly = poly(voices);
						const device = deviceFactory(thisPoly, params);
						return device;
					};
				}

				// Normal device: forward to each voice
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
									result = setter(resolveForVoice(value as Signal, _voiceIndex));
								}
							}
							return result;
						}

						// Bare signal (lambda, number, etc.) - apply to secondary input
						if (isDescriptor(device)) {
							return applyBareSignal(device, params as Signal);
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
				return callable(resolveForVoice(value, voiceIndex));
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
