import type { AnyDescriptor, Signal } from "../types";

/** Check if value is a poly descriptor */
function isPoly(value: unknown): value is { voices: readonly AnyDescriptor[] } {
	if (value === null || value === undefined) return false;
	if (typeof value !== "object" && typeof value !== "function") return false;
	return "_poly" in value && (value as { _poly: boolean })._poly === true;
}

/**
 * Resolve a signal value for a specific voice index.
 * - Arrays: distribute by index (with wraparound)
 * - Poly: distribute voices by index (with wraparound)
 * - Scalar: broadcast unchanged
 */
export function resolveForVoice(value: Signal, voiceIndex: number): Signal {
	if (Array.isArray(value)) {
		return value[voiceIndex % value.length]!;
	}
	if (isPoly(value)) {
		return value.voices[voiceIndex % value.voices.length] as Signal;
	}
	return value;
}
