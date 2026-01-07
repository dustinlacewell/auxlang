/**
 * Runtime types for the AudioWorklet.
 *
 * These types represent the serializable form of a graph
 * that can be sent to the worklet thread.
 *
 * All signals are polyphonic (1-16 channels). Mono is just 1 channel.
 */

/** A polyphonic signal - array of channel values */
export type PolySignal = number[];

/** Serialized device spec for worklet */
export interface SerializedSpec {
	readonly inputs: Record<string, { default: PolySignal }>;
	readonly outputs: readonly string[];
	readonly defaultOutput: string;
	readonly processSource: string;
}

/** A compiled node ready for worklet execution */
export interface CompiledNode {
	readonly id: string;
	readonly spec: SerializedSpec;
	readonly inputs: Record<string, CompiledInput>;
	readonly config: Record<string, string>; // Stringified functions
}

/** A compiled input - either constant or connection */
export type CompiledInput =
	| { readonly type: "constant"; readonly value: PolySignal }
	| { readonly type: "connection"; readonly nodeId: string; readonly output: string };

/** A compiled graph ready for worklet execution */
export interface CompiledGraph {
	readonly nodes: readonly CompiledNode[];
	readonly outputNodeId: string;
}

/** Message from main thread to worklet */
export type WorkletMessage = { type: "setGraph"; graph: CompiledGraph } | { type: "stop" };
