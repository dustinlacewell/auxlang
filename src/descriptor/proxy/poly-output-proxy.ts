import { applyBareSignal } from "../chaining/apply-bare-signal";
import { isDescriptor } from "../guards/is-descriptor";
import { isPlainParamsObject } from "../guards/is-params-object";
import { getDeviceFactory } from "../registry";
import { resolveForVoice } from "../signals/resolve-for-voice";
import type { AnyDescriptor, OutputRef, Signal } from "../types";

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

type PolyDescriptor = { _poly: true; voices: readonly AnyDescriptor[] };

// Forward declaration - will be passed in to avoid circular dependency
type PolyFn = (voices: AnyDescriptor[]) => PolyDescriptor;

/**
 * Create a chainable PolyOutputRef.
 * When you call .saw() on it, creates a saw for each voice output and returns a new poly.
 */
export function createChainablePolyOutputRef(
	outputRefs: OutputRef[],
	polyFn: PolyFn,
): PolyOutputRef {
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
						const newVoices = outputRefs.map((outputRef, voiceIndex) => {
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
										result = setter(resolveForVoice(value as Signal, voiceIndex));
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
						return polyFn(newVoices);
					};
				}
			}

			return undefined;
		},
	});
}
