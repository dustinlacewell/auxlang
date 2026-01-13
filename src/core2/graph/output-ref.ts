/**
 * Reference to a specific output of a node.
 */

import type { NodeId } from "./node";

export interface OutputRef {
	readonly ref: NodeId;
	readonly out: string;
}
