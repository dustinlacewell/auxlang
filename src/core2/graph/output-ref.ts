/**
 * Reference to a specific output of a node.
 *
 * The optional `voice` field pins to a specific voice index.
 * - undefined: connect to all voices (triggers poly expansion)
 * - number: connect to that specific voice only (no expansion from this input)
 */

import type { NodeId } from "./node";

export interface OutputRef {
	readonly ref: NodeId;
	readonly out: string;
	readonly voice?: number;
}
