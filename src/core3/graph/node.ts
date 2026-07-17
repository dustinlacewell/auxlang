/**
 * GNode — the patch-time graph node. A plain object; nodes reference each
 * other by OBJECT IDENTITY (sharing a variable = fan-out). No ids at
 * construction, no global registry of nodes: identity is assigned at
 * collection/compile time. A chain nobody roots is garbage, not a zombie.
 */

/** Reference to another node's output port (optionally a single lane of it). */
export interface NodeRef {
	readonly node: GNode;
	readonly port: string;
	readonly lane?: number;
}

/** Loop back-edge: reads the referenced output one sample late. */
export interface ZRef {
	readonly z: { readonly node: GNode; readonly port: string };
}

/** User per-sample lambda `(state, sampleRate, time) => number`. */
export interface LambdaInput {
	readonly lambda: (...args: unknown[]) => number;
}

/** Opaque pattern data (a Pat AST); compile expands it into a patsig node. */
export interface PatternInput {
	readonly pattern: unknown;
}

export type InputValue = number | NodeRef | ZRef | LambdaInput | PatternInput;

export interface GNode {
	readonly module: string;
	inputs: Record<string, InputValue>;
	config: Record<string, unknown>;
	pin?: string;
}
