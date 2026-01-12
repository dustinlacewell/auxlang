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
	readonly defaultInput: string;
	readonly defaultOutput: string;
	readonly processSource: string;
}

/** A serialized config value - either function source or plain data */
export type SerializedConfig =
	| { readonly type: "fn"; readonly source: string }
	| { readonly type: "data"; readonly value: unknown };

/** A compiled node ready for worklet execution */
export interface CompiledNode {
	readonly id: string;
	readonly spec: SerializedSpec;
	readonly inputs: Record<string, CompiledInput>;
	readonly config: Record<string, SerializedConfig>;
	readonly wasmBytes?: ArrayBuffer;
}

/** A single compiled source for poly voices - can be constant, connection, or lambda */
export type CompiledSource =
	| { readonly type: "constant"; readonly value: number }
	| { readonly type: "connection"; readonly nodeId: string; readonly output: string }
	| { readonly type: "lambda"; readonly fnSource: string };

/** A compiled input - constant, connection, lambda, or multi-connection for polyphonic */
export type CompiledInput =
	| { readonly type: "constant"; readonly value: PolySignal }
	| { readonly type: "connection"; readonly nodeId: string; readonly output: string }
	| { readonly type: "lambda"; readonly fnSource: string }
	| { readonly type: "connections"; readonly sources: readonly CompiledSource[] };

/** A compiled graph ready for worklet execution */
export interface CompiledGraph {
	readonly nodes: readonly CompiledNode[];
	readonly outputNodeId: string;
}

/** Stereo compiled graphs - separate graphs for left and right channels */
export interface CompiledStereoGraph {
	left: CompiledGraph;
	right: CompiledGraph;
}

/** Message from main thread to worklet */
export type WorkletMessage =
	| { type: "setGraph"; graph: CompiledGraph }
	| { type: "setStereoGraph"; stereo: CompiledStereoGraph }
	| { type: "stop" };
