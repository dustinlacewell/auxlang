/**
 * Normalize signal values - convert wrapped nodes to OutputRefs.
 */

import { getDeviceSpec } from "../device/registry";
import type { Node } from "../graph/node";
import type { OutputRef } from "../graph/output-ref";
import { isInputSetter, INPUT_SETTER, type InputSetterInfo, isChainMethod, CHAIN_METHOD, type ChainMethodInfo } from "../wrap/wrap";
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
	return (
		typeof value === "object" &&
		value !== null &&
		"ref" in value &&
		"out" in value
	);
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
 * - Node[] (WrappedArray) → OutputRef[]
 * - OutputRef (with optional voice) → pass through
 * - number, number[], SignalLambda → pass through
 */
export function normalizeSignal(value: unknown): NodeInput {
	// Check for misuse of input setter methods as signals
	if (isInputSetter(value)) {
		const info = (value as unknown as Record<symbol, InputSetterInfo>)[INPUT_SETTER]!;
		throw new Error(
			`Cannot use '${info.device}.${info.input}' as a signal - it's a setter method, not an output. ` +
			`Did you mean to use an output like '.gate' or '.cv'?`
		);
	}

	// Check for uncalled chain methods used as signals
	if (isChainMethod(value)) {
		const info = (value as unknown as Record<symbol, ChainMethodInfo>)[CHAIN_METHOD]!;
		throw new Error(
			`Cannot use '${info.sourceDevice}.${info.targetDevice}' as a signal - did you forget to call it? ` +
			`Use '${info.sourceDevice}.${info.targetDevice}()' to create the device.`
		);
	}

	if (isNode(value)) {
		// Convert node to its default output ref
		const spec = getDeviceSpec(value.device);
		const defaultOutput = spec?.defaultOutput ?? "out";
		return { ref: value.id, out: defaultOutput };
	}

	// Array of nodes → array of OutputRefs
	if (isNodeArray(value)) {
		const arr = Array.isArray(value) ? value : Array.from(value as Iterable<Node>);
		return arr.map((node) => {
			const spec = getDeviceSpec(node.device);
			const defaultOutput = spec?.defaultOutput ?? "out";
			return { ref: node.id, out: defaultOutput } as OutputRef;
		});
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
