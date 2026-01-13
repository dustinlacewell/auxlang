/**
 * Creates plain node objects with unique IDs.
 * Does NOT register with builder - caller decides whether to register.
 */

import type { ConfigValue } from "../signal/config-value";
import type { NodeInput } from "../signal/node-input";
import type { Node } from "./node";

let nodeCounter = 0;

export function resetNodeCounter(): void {
	nodeCounter = 0;
}

export function createNode(
	device: string,
	inputs: Record<string, NodeInput>,
	config: Record<string, ConfigValue> = {},
): Node {
	const id = `${device}${++nodeCounter}`;
	const node: Node = { id, device, inputs, config };
	return node;
}
