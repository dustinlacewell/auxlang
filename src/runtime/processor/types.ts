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

// Import and re-export PolySignal from poly-signal module
import type { PolySignal, VoiceChannel } from "./poly-signal";
export type { PolySignal, VoiceChannel };

// Legacy format - used for serialization and constants
export type LegacyPolySignal = number[];

export interface SerializedSpec {
	// Default values stored in legacy format (simple number arrays)
	inputs: Record<string, { default: LegacyPolySignal }>;
	outputs: readonly string[];
	defaultInput: string;
	defaultOutput: string;
	processSource: string;
}

export interface CompiledInput {
	type: "constant" | "connection";
	// Constants stored in legacy format
	value?: LegacyPolySignal;
	nodeId?: string;
	output?: string;
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

export type WorkletMessage =
	| { type: "setGraph"; graph: CompiledGraph }
	| { type: "stop" };

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
