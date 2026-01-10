import type { Signal } from "../types";

/**
 * Check if a value is a signal array that should expand to polyphony.
 * Any non-empty array passed as an input triggers poly expansion.
 */
export function isSignalArray(value: unknown): value is Signal[] {
	return Array.isArray(value) && value.length > 0;
}
