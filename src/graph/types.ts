/**
 * Runtime graph types.
 *
 * The graph is the reified form of the descriptor DAG.
 * It contains concrete nodes ready for AudioWorklet execution.
 */

import type { ConfigValue, DescriptorId, DeviceSpec, SignalLambda } from "../descriptor/types";

/** A concrete node in the runtime graph */
export interface GraphNode {
	readonly id: DescriptorId;
	readonly spec: DeviceSpec;
	readonly inputBindings: Record<string, ResolvedInput>;
	readonly configBindings: Record<string, ConfigValue>;
}

/** A single resolved source - constant, connection, or lambda (no nesting) */
export type SourceInput =
	| { readonly type: "constant"; readonly value: number }
	| { readonly type: "connection"; readonly nodeId: DescriptorId; readonly output: string }
	| { readonly type: "lambda"; readonly fn: SignalLambda };

/** A resolved input - single source or multi-source for polyphonic */
export type ResolvedInput =
	| { readonly type: "constant"; readonly value: number | number[] }
	| { readonly type: "connection"; readonly nodeId: DescriptorId; readonly output: string }
	| { readonly type: "lambda"; readonly fn: SignalLambda }
	| { readonly type: "connections"; readonly sources: readonly SourceInput[] };

/** The complete runtime graph */
export interface Graph {
	/** Nodes in topological order (dependencies first) */
	readonly nodes: readonly GraphNode[];
	/** The final output node */
	readonly outputNodeId: DescriptorId;
}
