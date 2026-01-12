import type { AnyDescriptor, Signal } from "../types";

/** Check if value is a poly descriptor */
function isPoly(value: unknown): value is { voices: readonly AnyDescriptor[] } {
	if (value === null || value === undefined) return false;
	if (typeof value !== "object" && typeof value !== "function") return false;
	return "_poly" in value && (value as { _poly: boolean })._poly === true;
}

/** Check if value is a plain params object (not a signal type) */
function isPlainParamsObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null) return false;
	if (Array.isArray(value)) return false;
	// Check for special marker properties that indicate it's a Signal, not params
	if ("_feedback" in value) return false;
	if ("descriptorId" in value) return false;
	if ("_state" in value) return false;
	if ("_poly" in value) return false;
	if ("_polyOutputs" in value) return false;
	return true;
}

/**
 * Resolve a signal value for a specific voice index.
 * - Arrays: distribute by index (with wraparound)
 * - Poly: distribute voices by index (with wraparound)
 * - Plain objects: recursively resolve each property
 * - Scalar: broadcast unchanged
 */
export function resolveForVoice(value: Signal, voiceIndex: number): Signal {
	if (Array.isArray(value)) {
		return value[voiceIndex % value.length]!;
	}
	if (isPoly(value)) {
		return value.voices[voiceIndex % value.voices.length] as Signal;
	}
	// Recursively resolve plain params objects (e.g., { level: polyEnvelope })
	if (isPlainParamsObject(value)) {
		const resolved: Record<string, Signal> = {};
		for (const [key, propValue] of Object.entries(value)) {
			resolved[key] = resolveForVoice(propValue as Signal, voiceIndex);
		}
		return resolved as unknown as Signal;
	}
	return value;
}
