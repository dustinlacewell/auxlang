import { applyBareSignal } from "../chaining/apply-bare-signal";
import { isDescriptor } from "../guards/is-descriptor";
import { isPlainParamsObject } from "../guards/is-params-object";
import { getDeviceFactory } from "../registry";
import { applyParams } from "../signals/apply-params";
import type { AnyDescriptor, DescriptorId, OutputRef, Signal } from "../types";

type PolyDescriptor = { _poly: true; voices: readonly AnyDescriptor[] };

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
export function createChainableOutput(
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
			return applyParams(device, params);
		}

		// Bare signal (lambda, number, OutputRef, etc.) - apply to secondary input
		if (isDescriptor(device)) {
			return applyBareSignal(device, params as Signal);
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
