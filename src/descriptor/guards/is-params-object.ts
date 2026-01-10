import type { Signal } from "../types";

/**
 * Check if value is a plain params object (not a function, array, or special signal type).
 * Used to distinguish `{ key: value }` params from bare signals like lambdas.
 */
export function isPlainParamsObject(value: unknown): value is Record<string, Signal> {
	if (typeof value !== "object" || value === null) return false;
	if (Array.isArray(value)) return false;
	// Check for special marker properties that indicate it's a Signal, not params
	if ("_feedback" in value) return false;
	if ("descriptorId" in value) return false;
	if ("_state" in value) return false;
	return true;
}
