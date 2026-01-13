/**
 * Normalize signal values - convert wrapped nodes to OutputRefs.
 */

import { getDeviceSpec } from "../device/registry";
import type { Node } from "../graph/node";
import type { OutputRef } from "../graph/output-ref";
import type { NodeInput } from "./node-input";

/**
 * Check if value is a Node (has id, device, inputs).
 * Note: Wrapped nodes are callable (typeof "function"), so check both.
 */
function isNode(value: unknown): value is Node {
	if (value === null || value === undefined) return false;
	const t = typeof value;
	if (t !== "object" && t !== "function") return false;

	const v = value as Record<string, unknown>;
	return (
		"id" in v &&
		"device" in v &&
		typeof v.id === "string" &&
		typeof v.device === "string"
	);
}

/**
 * Check if value is an OutputRef.
 */
function isOutputRef(value: unknown): value is OutputRef {
	return typeof value === "object" && value !== null && "ref" in value && "out" in value;
}

/**
 * Check if value is an array-like of Nodes (WrappedArray from poly).
 * WrappedArray is a Proxy around a function with numeric indices, not a true array.
 */
function isNodeArray(value: unknown): value is Node[] {
	// True arrays
	if (Array.isArray(value)) {
		return value.length > 0 && isNode(value[0]);
	}
	// WrappedArray: callable with length property and node at index 0
	if (typeof value === "function" && "length" in value) {
		const v = value as unknown as { length: number; 0?: unknown };
		if (typeof v.length === "number" && v.length > 0 && v[0] !== undefined) {
			return isNode(v[0]);
		}
	}
	return false;
}

/**
 * Normalize a signal value for binding to an input.
 * - Node → OutputRef (using default output)
 * - Node[] (WrappedArray) → pass through as-is (resolved per-voice later)
 * - OutputRef → pass through
 * - number, number[], SignalLambda → pass through
 */
export function normalizeSignal(value: unknown): NodeInput {
	if (isNode(value)) {
		// Convert node to its default output ref
		const spec = getDeviceSpec(value.device);
		const defaultOutput = spec?.defaultOutput ?? "out";
		return { ref: value.id, out: defaultOutput };
	}

	// WrappedArray (poly of nodes) - pass through as-is
	// Will be resolved per-voice in resolveInputsForVoice during poly chaining
	if (isNodeArray(value)) {
		return value as unknown as NodeInput;
	}

	if (isOutputRef(value)) {
		return value;
	}

	// Pass through numbers, arrays (of numbers), lambdas
	return value as NodeInput;
}

/**
 * Normalize all values in a params object.
 */
export function normalizeParams(params: Record<string, unknown>): Record<string, NodeInput> {
	const result: Record<string, NodeInput> = {};
	for (const [key, value] of Object.entries(params)) {
		result[key] = normalizeSignal(value);
	}
	return result;
}
