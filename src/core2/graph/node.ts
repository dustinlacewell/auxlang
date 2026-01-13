/**
 * A node in the flat graph - plain data object.
 *
 * No proxy, no _state, just data. Device spec is looked up by name
 * from the registry, not embedded here.
 */

import type { ConfigValue } from "../signal/config-value";
import type { NodeInput } from "../signal/node-input";

export type NodeId = string;

export interface Node {
	readonly id: NodeId;
	readonly device: string;
	readonly inputs: Record<string, NodeInput>;
	readonly config: Record<string, ConfigValue>;
}
