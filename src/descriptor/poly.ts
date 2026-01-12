/**
 * Poly descriptor - wraps multiple signals for polyphonic processing.
 *
 * Poly is a simple container that maps operations across voices.
 * It doesn't inspect voice types - any signal can be a voice.
 *
 * Example:
 *   poly([440, 550]).saw().lpf(800)
 *   // Creates poly of 2 constants, then poly of 2 saws, then poly of 2 lpfs
 */

import { isDescriptor } from "./guards/is-descriptor";
import { isOutputRef } from "./guards/is-output-ref";
import { createChainablePolyOutputRef, isPolyOutputRef, type PolyOutputRef } from "./proxy/poly-output-proxy";
import { getDeviceFactory, getDeviceSpec, getOutputHandler } from "./registry";
import { resolveForVoice } from "./signals/resolve-for-voice";
import type { AnyDescriptor, OutputRef, Signal } from "./types";

// Re-export for external use
export { isPolyOutputRef, type PolyOutputRef } from "./proxy/poly-output-proxy";

/** A poly descriptor wrapping N signals */
export interface PolyDescriptor {
	readonly _poly: true;
	readonly voices: readonly Signal[];
}

/** Type guard for poly descriptors */
export function isPoly(value: unknown): value is PolyDescriptor {
	if (value === null || value === undefined) return false;
	if (typeof value !== "object" && typeof value !== "function") return false;
	return "_poly" in value && (value as PolyDescriptor)._poly === true;
}

/**
 * Flatten an array that may contain nested polys into a flat array of signals.
 */
function flattenVoices(items: Signal[]): Signal[] {
	const result: Signal[] = [];
	for (const item of items) {
		if (isPoly(item)) {
			result.push(...item.voices);
		} else {
			result.push(item);
		}
	}
	return result;
}

/**
 * Create a poly descriptor from an array of signals.
 *
 * The poly proxy forwards method calls to device factories:
 * - Device chaining: looks up factory, calls factory(voice) for each voice
 * - Output accessors: returns PolyOutputRef for descriptor voices
 * - `.voices` returns the array for manual iteration
 * - `.out()` registers all voices for output
 */
export function poly(voicesInput: Signal[]): PolyDescriptor {
	const voices = flattenVoices(voicesInput);

	if (voices.length === 0) {
		throw new Error("poly() requires at least one voice");
	}

	const handler: ProxyHandler<{ _poly: true; voices: Signal[] }> = {
		get(target, prop: string | symbol): unknown {
			if (prop === "_poly") return true;
			if (prop === "voices") return voices;
			if (typeof prop === "symbol") return undefined;

			// .out() - terminal output registration
			if (prop === "out") {
				return () => {
					const outputHandler = getOutputHandler();
					if (outputHandler) {
						// Only pass descriptor voices to output - constants/lambdas can't be outputs
						const descriptorVoices = voices.filter(isDescriptor) as AnyDescriptor[];
						if (descriptorVoices.length > 0) {
							outputHandler(descriptorVoices);
						}
					}
				};
			}

			// .apply(fn) - call fn with this poly and return the result
			if (prop === "apply") {
				return <T>(fn: (p: PolyDescriptor) => T): T => fn(poly(voices));
			}

			// Device chaining: look up factory, call with each voice
			const deviceFactory = getDeviceFactory(prop);
			const deviceSpec = getDeviceSpec(prop);
			if (deviceFactory && deviceSpec) {
				// Polyphonic device: pass the poly directly
				if (deviceSpec.polyphonic) {
					return (params?: Signal): AnyDescriptor | PolyDescriptor => {
						// Pass chain source as named param to defaultInput
						// params goes as first positional (if provided)
						const args = params !== undefined
							? [params, { [deviceSpec.defaultInput]: poly(voices) }]
							: [{ [deviceSpec.defaultInput]: poly(voices) }];
						return deviceFactory(...args);
					};
				}

				// Normal device: map factory across voices
				return (params?: Signal): PolyDescriptor => {
					const newVoices = voices.map((voice, i) => {
						const resolvedParams = params !== undefined ? resolveForVoice(params, i) : undefined;
						// Pass chain source as named param to defaultInput
						const args = resolvedParams !== undefined
							? [resolvedParams, { [deviceSpec.defaultInput]: voice }]
							: [{ [deviceSpec.defaultInput]: voice }];
						return deviceFactory(...args);
					});
					return poly(newVoices);
				};
			}

			// Output accessor - only works for descriptor voices
			// Try to get the output from each voice that supports it
			const outputRefs: OutputRef[] = [];
			for (const voice of voices) {
				if (isDescriptor(voice)) {
					const ref = (voice as unknown as Record<string, unknown>)[prop];
					// Use isOutputRef - can't use "in" operator on Proxy objects
					if (isOutputRef(ref)) {
						outputRefs.push(ref);
					}
				}
			}
			if (outputRefs.length > 0) {
				return createChainablePolyOutputRef(outputRefs, poly);
			}

			// Input setter - check if all descriptor voices have this as a callable method
			// This handles cases like seq("{c3,g3}").clk(clock(60))
			const firstVoice = voices[0];
			if (isDescriptor(firstVoice)) {
				const method = (firstVoice as unknown as Record<string, unknown>)[prop];
				if (typeof method === "function") {
					// It's a method - return a function that applies it to all voices
					return (value?: Signal): PolyDescriptor => {
						const newVoices = voices.map((voice, i) => {
							if (isDescriptor(voice)) {
								const voiceMethod = (voice as unknown as Record<string, (v: Signal) => AnyDescriptor>)[prop];
								if (typeof voiceMethod === "function") {
									const resolvedValue = value !== undefined ? resolveForVoice(value, i) : undefined;
									return voiceMethod(resolvedValue as Signal);
								}
							}
							return voice;
						});
						return poly(newVoices);
					};
				}
			}

			return undefined;
		},

		// Make poly callable - passes value to each voice via factory's default input
		apply(target, thisArg, args: [Signal]): PolyDescriptor {
			const [value] = args;
			const newVoices = voices.map((voice, i) => {
				const resolvedValue = resolveForVoice(value, i);
				// If voice is a descriptor, call it with the value
				if (isDescriptor(voice)) {
					return (voice as AnyDescriptor)(resolvedValue);
				}
				// Non-descriptor voices can't be called - return as-is
				return voice;
			});
			return poly(newVoices);
		},
	};

	const callable = (() => {}) as unknown as { _poly: true; voices: Signal[] };
	callable._poly = true;
	callable.voices = voices as Signal[];

	return new Proxy(callable, handler) as unknown as PolyDescriptor;
}

/**
 * Get voice count from a signal source.
 */
export function getVoiceCount(source: Signal): number {
	if (isPoly(source)) {
		return source.voices.length;
	}
	return 1;
}

/**
 * Get individual voices from a signal source.
 */
export function getVoices(source: Signal): Signal[] {
	if (isPoly(source)) {
		return [...source.voices];
	}
	return [source];
}
