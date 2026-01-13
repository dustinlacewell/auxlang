/**
 * Poly - creates a poly array from discrete signals.
 *
 * Usage:
 *   poly([saw(220), saw(330), saw(440)]) - wraps nodes
 *   poly([s.voices[0], s.voices[1]]) - wraps OutputRefs
 *
 * When given OutputRefs, returns a ChainableOutputRefArray that supports:
 *   .apply(v => v.gate.adsr()) - maps function over each ref
 *   .tri() - chains device to each ref
 *   .out() - outputs all refs
 */

import { device } from "../device/device";
import { inputs } from "../device/inputs";
import type { OutputRef } from "../graph/output-ref";
import { wrapOutputRefArray } from "../wrap/chainable-output-ref";
import type { WrappedNode } from "../wrap/wrap";

function isOutputRef(value: unknown): value is OutputRef {
	return typeof value === "object" && value !== null && "ref" in value && "out" in value;
}

function isOutputRefArray(value: unknown): value is OutputRef[] {
	return Array.isArray(value) && value.length > 0 && isOutputRef(value[0]);
}

/**
 * Poly function - handles both OutputRef arrays and node arrays.
 */
export function poly(input: OutputRef[] | WrappedNode[]): unknown {
	// If given OutputRefs, wrap them directly (no device node needed)
	if (isOutputRefArray(input)) {
		return wrapOutputRefArray(input);
	}

	// Otherwise, use the poly device for nodes
	return polyDevice(input);
}

/**
 * Poly device - pass-through for creating poly from discrete node signals.
 */
const polyDevice = device("poly", {
	inputs: inputs({ input: 0 }),
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		out.signal = (inp.input as number) ?? 0;
	},
});
