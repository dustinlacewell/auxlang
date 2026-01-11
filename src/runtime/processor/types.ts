// AudioWorklet globals - these exist in the worklet context
declare const sampleRate: number;
declare class AudioWorkletProcessor {
	readonly port: MessagePort;
	process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Record<string, Float32Array>,
	): boolean;
}
declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;

export interface SerializedSpec {
	inputs: Record<string, { default: number[] }>;
	outputs: readonly string[];
	defaultInput: string;
	defaultOutput: string;
	processSource: string;
	/** If true, device is polyphonic and uses processAll */
	polyphonic?: boolean;
	/** Process function source for polyphonic devices */
	processAllSource?: string;
}

export interface CompiledInput {
	type: "constant" | "connection" | "lambda" | "connections";
	value?: number[];
	nodeId?: string;
	output?: string;
	fnSource?: string;
	/** For multi-connection (polyphonic) inputs */
	sources?: { nodeId: string; output: string }[];
}

/** Serialized config - function source or plain data */
export type SerializedConfig =
	| { type: "fn"; source: string }
	| { type: "data"; value: unknown };

export interface CompiledNode {
	id: string;
	spec: SerializedSpec;
	inputs: Record<string, CompiledInput>;
	config: Record<string, SerializedConfig>;
	wasmBytes?: ArrayBuffer;
}

export interface CompiledGraph {
	nodes: readonly CompiledNode[];
	outputNodeId: string;
}

/** Stereo compiled graphs - separate graphs for left and right channels */
export interface CompiledStereoGraph {
	left: CompiledGraph;
	right: CompiledGraph;
}

export type WorkletMessage =
	| { type: "setGraph"; graph: CompiledGraph }
	| { type: "setStereoGraph"; stereo: CompiledStereoGraph }
	| { type: "stop" };

/** A hydrated config function */
export type ConfigFn = (...args: unknown[]) => unknown;

/** A hydrated config value - either a function or plain data */
export type ConfigVal = ConfigFn | unknown;
