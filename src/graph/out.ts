import { isDescriptor } from "../descriptor/is-descriptor";
import { isOutputRef } from "../descriptor/is-output-ref";
import { getDescriptor } from "../descriptor/registry";
import type { AnyDescriptor, Signal } from "../descriptor/types";
import { reify } from "./reify";
import type { Graph } from "./types";

/**
 * Reify a signal into a runtime graph.
 *
 * This is the entry point for users - calling out() on a signal
 * triggers the graph to be built and (eventually) sent to the runtime.
 */
export function out(signal: Signal | AnyDescriptor): Graph {
	const descriptor = resolveToDescriptor(signal);
	return reify(descriptor);
}

function resolveToDescriptor(signal: Signal | AnyDescriptor): AnyDescriptor {
	if (isDescriptor(signal)) {
		return signal;
	}

	if (isOutputRef(signal)) {
		const descriptor = getDescriptor(signal.descriptorId);
		if (!descriptor) {
			throw new Error(`Unknown descriptor: ${signal.descriptorId}`);
		}
		return descriptor;
	}

	throw new Error(`Cannot reify constant signal: ${signal}`);
}
