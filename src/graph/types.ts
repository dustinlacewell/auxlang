/**
 * Runtime graph types.
 *
 * The graph is the reified form of the descriptor DAG.
 * It contains concrete nodes ready for AudioWorklet execution.
 */

import type { ConfigValue, DescriptorId, DeviceSpec } from "../descriptor/types";

/** A concrete node in the runtime graph */
export interface GraphNode {
	readonly id: DescriptorId;
	readonly spec: DeviceSpec;
	readonly inputBindings: Record<string, ResolvedInput>;
	readonly configBindings: Record<string, ConfigValue>;
}

/** A resolved input - either constant or a reference to another node's output */
export type ResolvedInput =
	| { readonly type: "constant"; readonly value: number | number[] }
	| { readonly type: "connection"; readonly nodeId: DescriptorId; readonly output: string };

/** The complete runtime graph */
export interface Graph {
	/** Nodes in topological order (dependencies first) */
	readonly nodes: readonly GraphNode[];
	/** The final output node */
	readonly outputNodeId: DescriptorId;
}
