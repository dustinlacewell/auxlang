/**
 * A node input value - what can be connected to a device input.
 *
 * - number: constant value
 * - number[]: poly values (expanded in expandPoly pass)
 * - OutputRef: connection to another node's output
 * - OutputRef[]: poly connections (from device-driven expansion)
 * - VoiceRef: symbolic reference to a voice (resolved at expansion)
 * - VoiceRef[]: array of symbolic voice references
 * - SignalLambda: per-sample function
 */

import type { NodeId } from "../graph/node";
import type { OutputRef } from "../graph/output-ref";
import type { SignalLambda } from "./signal-lambda";

/**
 * Symbolic reference to a specific voice of a poly source.
 * Resolved to OutputRef at expansion time.
 */
export interface VoiceRef {
	readonly type: "voiceRef";
	readonly source: NodeId;
	readonly index: number;
	readonly output?: string;
}

export function isVoiceRef(value: unknown): value is VoiceRef {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as VoiceRef).type === "voiceRef" &&
		typeof (value as VoiceRef).source === "string" &&
		typeof (value as VoiceRef).index === "number"
	);
}

export function isVoiceRefArray(value: unknown): value is VoiceRef[] {
	return Array.isArray(value) && value.length > 0 && isVoiceRef(value[0]);
}

export type NodeInput =
	| number
	| number[]
	| OutputRef
	| OutputRef[]
	| VoiceRef
	| VoiceRef[]
	| SignalLambda;
