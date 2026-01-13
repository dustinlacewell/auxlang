/**
 * Types for core2 worklet communication.
 *
 * Simplified from v1:
 * - Specs sent once, nodes reference by device name
 * - No poly complexity in worklet (handled by expandPoly)
 * - Inputs are always scalar after expansion
 */

/** Serialized device spec - just what the worklet needs to execute */
export interface WorkletSpec {
	readonly inputs: Record<string, { default: number }>;
	readonly outputs: readonly string[];
	readonly defaultInput: string;
	readonly defaultOutput: string;
	readonly processSource: string;
}

/** Serialized config value */
export type WorkletConfig =
	| { readonly type: "fn"; readonly source: string }
	| { readonly type: "data"; readonly value: unknown };

/** Resolved input - what an input connects to */
export type WorkletInput =
	| { readonly type: "constant"; readonly value: number }
	| { readonly type: "connection"; readonly nodeId: string; readonly output: string }
	| { readonly type: "lambda"; readonly source: string };

/** A node ready for worklet execution */
export interface WorkletNode {
	readonly id: string;
	readonly device: string;
	readonly inputs: Record<string, WorkletInput>;
	readonly config: Record<string, WorkletConfig>;
	/** WASM bytes if this node uses a WASM device */
	readonly wasmBytes?: ArrayBuffer;
}

/** Complete graph for worklet (mono) */
export interface WorkletGraph {
	readonly specs: Record<string, WorkletSpec>;
	readonly nodes: readonly WorkletNode[];
	readonly outputIds: readonly string[];
}

/**
 * Stereo graph - single set of nodes, separate L/R output routing.
 * Nodes are processed once per sample, outputs routed to channels by ID.
 */
export interface WorkletStereoGraph {
	readonly specs: Record<string, WorkletSpec>;
	readonly nodes: readonly WorkletNode[];
	readonly leftOutputIds: readonly string[];
	readonly rightOutputIds: readonly string[];
}

/** Messages to worklet */
export type WorkletMessage =
	| { type: "setStereoGraph"; stereo: WorkletStereoGraph }
	| { type: "stop" };
