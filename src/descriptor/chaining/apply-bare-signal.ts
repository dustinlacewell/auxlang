import { findSecondaryInput } from "./find-secondary-input";
import type { AnyDescriptor, Signal } from "../types";

type SetterFn = (value: Signal) => AnyDescriptor;

/**
 * Apply a bare signal to a descriptor's first non-default input.
 * Used for syntax like: source.add(x => x.delay())
 * Returns the original descriptor if no secondary input exists.
 */
export function applyBareSignal(descriptor: AnyDescriptor, signal: Signal): AnyDescriptor {
	const secondaryInput = findSecondaryInput(descriptor._state.spec);
	if (!secondaryInput) {
		return descriptor;
	}

	const setter = (descriptor as unknown as Record<string, SetterFn>)[secondaryInput];
	if (typeof setter === "function") {
		return setter(signal);
	}

	return descriptor;
}
