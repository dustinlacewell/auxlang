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

// All signals are polyphonic: number[] where length = channel count (1-16)
export type PolySignal = number[];

export interface SerializedSpec {
	inputs: Record<string, { default: PolySignal }>;
	outputs: readonly string[];
	defaultOutput: string;
	processSource: string;
}

export interface CompiledInput {
	type: "constant" | "connection";
	value?: PolySignal;
	nodeId?: string;
	output?: string;
}

export interface CompiledNode {
	id: string;
	spec: SerializedSpec;
	inputs: Record<string, CompiledInput>;
	config: Record<string, string>;
}

export interface CompiledGraph {
	nodes: readonly CompiledNode[];
	outputNodeId: string;
}

export interface WorkletMessage {
	type: "setGraph" | "stop";
	graph?: CompiledGraph;
}

/** A hydrated config function */
export type ConfigFn = (...args: unknown[]) => unknown;

/** Runtime node with hydrated process function */
export interface RuntimeNode {
	id: string;
	inputs: CompiledNode["inputs"];
	config: Record<string, ConfigFn>;
	defaultOutput: string;
	process: (
		inputs: Record<string, PolySignal>,
		config: Record<string, ConfigFn>,
		state: Record<string, unknown>,
		sampleRate: number,
	) => Record<string, number | PolySignal>;
	state: Record<string, unknown>;
}
