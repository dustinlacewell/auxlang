import { getDeviceFactory, getDeviceSpec } from "../registry";
import type { AnyDescriptor, DescriptorId, OutputRef, Signal } from "../types";

type PolyDescriptor = { _poly: true; voices: readonly Signal[] };

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
	// Accepts any number of positional args, passed through to the factory
	const callable = (...args: unknown[]): AnyDescriptor | PolyDescriptor => {
		const deviceFactory = getDeviceFactory(outputName);
		const deviceSpec = getDeviceSpec(outputName);
		if (!deviceFactory || !deviceSpec) {
			throw new Error(`"${outputName}" is not a registered device`);
		}
		// Use the default output of the source descriptor as the chained signal
		const sourceRef: OutputRef = { descriptorId, outputName: defaultOutput };

		// Pass chain source as named param to defaultInput, after all user args
		// This disambiguates chaining from positional args
		return deviceFactory(...args, { [deviceSpec.defaultInput]: sourceRef });
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
