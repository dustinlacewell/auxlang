/**
 * Creates a placeholder device node at API time.
 *
 * All expand calls are deferred to expandPoly, where nodes are processed
 * in topological order after poly duplication.
 */

import { createNode } from "../graph/create-node";
import { getBuilder } from "../graph/graph-builder";
import type { Node } from "../graph/node";
import type { ConfigValue } from "../signal/config-value";
import type { NodeInput } from "../signal/node-input";
import type { DeviceSpec } from "./device-spec";

/**
 * Create a placeholder node for a device and register it with the builder.
 * Expand is NOT called here - all expansion happens in expandPoly.
 */
export function createDeviceNode(
	deviceName: string,
	_spec: DeviceSpec,
	inputs: Record<string, NodeInput>,
	config: Record<string, ConfigValue>,
): Node {
	const node = createNode(deviceName, inputs, config);
	getBuilder().addNode(node);
	return node;
}
