/**
 * Types for runtime nodes.
 */

import type { WorkletConfig, WorkletInput, WorkletSpec } from "../../../worklet-types";
import type { CollectedStates } from "../collected-states";
import type { ProcessContext } from "../../../../device/process-fn";

export type ProcessFn = (
	inputs: Record<string, number>,
	config: Record<string, unknown>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
	out: Record<string, number>,
	ctx: ProcessContext,
) => void;

export type ProcessAllFn = (
	inputs: Record<string, number[]>,
	config: Record<string, unknown>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
	out: Record<string, number>,
	ctx: ProcessContext,
) => void;

export type LambdaFn = (state: Record<string, unknown>, sr: number, time: number) => number;

export type InputResolver = (sr: number, time: number) => number;

export type ArrayResolver = () => number[];

export interface RuntimeNode {
	readonly id: string;
	readonly process?: ProcessFn | undefined;
	readonly processAll?: ProcessAllFn | undefined;
	readonly inputs: Record<string, number>;
	readonly inputArrays: Record<string, number[]>;
	readonly config: Record<string, unknown>;
	readonly state: Record<string, unknown>;
	readonly outputs: Record<string, number>;
	readonly resolveInputs: (sr: number, time: number) => void;
	readonly resolveInputArrays: (sr: number, time: number) => void;
	readonly lambdaStates: Map<string, Record<string, unknown>>;
}

export interface BuildNodeContext {
	node: {
		id: string;
		device: string;
		inputs: Record<string, WorkletInput>;
		config: Record<string, WorkletConfig>;
	};
	spec: WorkletSpec;
	wasmInstance: WebAssembly.Instance | undefined;
	oldNodeId: string | undefined;
	oldStates: CollectedStates | undefined;
	nodeIndexById: Map<string, number>;
	nodeOutputs: Record<string, number>[];
}
