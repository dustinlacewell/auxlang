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
}

export interface CompiledInput {
	type: "constant" | "connection" | "lambda";
	value?: number[];
	nodeId?: string;
	output?: string;
	fnSource?: string;
}

export interface CompiledNode {
	id: string;
	spec: SerializedSpec;
	inputs: Record<string, CompiledInput>;
	config: Record<string, string>;
	wasmBytes?: ArrayBuffer;
}

export interface CompiledGraph {
	nodes: readonly CompiledNode[];
	outputNodeId: string;
}

export type WorkletMessage = { type: "setGraph"; graph: CompiledGraph } | { type: "stop" };

/** A hydrated config function */
export type ConfigFn = (...args: unknown[]) => unknown;
