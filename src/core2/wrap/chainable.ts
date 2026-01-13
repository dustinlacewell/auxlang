/**
 * Chainable wrapper type - what the user interacts with.
 *
 * Provides fluent API via proxy over plain Node objects.
 * The underlying data is always plain Node - this just adds
 * method chaining and output access.
 */

import type { Node } from "../graph/node";
import type { OutputRef } from "../graph/output-ref";

/**
 * A wrapped node with chainable methods.
 *
 * - Callable: node(value) sets default input
 * - Output access: node.audio returns OutputRef
 * - Input setters: node.freq(440) returns new Chainable
 * - Device chaining: node.lpf() returns new Chainable
 */
export type Chainable<T extends Node | Node[]> = T extends Node[]
	? ChainableArray
	: ChainableSingle;

export interface ChainableSingle extends Node {
	/** Call to set default input */
	(value: unknown): ChainableSingle;
	/** Output access returns OutputRef */
	readonly [output: string]: OutputRef | unknown;
}

export interface ChainableArray extends Array<Node> {
	/** Call to set default input on all nodes */
	(value: unknown): ChainableArray;
	/** Output access returns OutputRef[] */
	readonly [output: string]: OutputRef[] | unknown;
}
