/**
 * The tick call: one static call site per (node, lane), so each site sees one
 * function and V8 can inline small ticks. Module ticks are called as-is with
 * the interpreter's argument list.
 */

/** Scope names of the per-node objects every tick call reads. */
export interface NodeNames {
	readonly tick: string;
	readonly ins: string;
	readonly outs: string;
	readonly config: string;
}

export function emitMapTickCall(node: NodeNames, state: string): string {
	return `${node.tick}(${state}, ${node.ins}, ${node.outs}, ${node.config}, sr);`;
}

export function emitReduceTickCall(node: NodeNames, state: string, width: number): string {
	return `${node.tick}(${state}, ${node.ins}, ${node.outs}, ${node.config}, sr, ${width});`;
}
