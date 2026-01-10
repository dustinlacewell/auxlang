import type { AnyDescriptor, Signal } from "../types";

type Chainable = AnyDescriptor | { _poly: true; voices: readonly AnyDescriptor[] };
type SetterFn = (value: Signal) => Chainable;
type SetterMap = Record<string, SetterFn>;

/**
 * Apply a params object to a descriptor by calling setter methods.
 * Returns the final descriptor after all setters have been chained.
 */
export function applyParams(descriptor: Chainable, params: Record<string, Signal>): Chainable {
	let result = descriptor;
	for (const [key, value] of Object.entries(params)) {
		const setter = (result as unknown as SetterMap)[key];
		if (typeof setter === "function") {
			result = setter(value);
		}
	}
	return result;
}
