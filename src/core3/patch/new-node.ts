/**
 * Every node the patch layer builds is made here, so a node built while
 * compile expands a sub-patch instance carries that instance's scope.
 */

import type { GNode, InputValue } from "../graph/node";
import { scoped } from "../graph/scope";
import { currentScope } from "./context";

export function newNode(
	module: string,
	inputs: Record<string, InputValue>,
	config: Record<string, unknown>,
): GNode {
	return { module, inputs, config, ...scoped(currentScope()) };
}
