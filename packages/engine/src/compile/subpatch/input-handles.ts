/**
 * One handle per sub-patch input, for `patch` to build with. A connection is
 * a handle on its own source, so chaining from it is exactly the inline
 * graph. Any other value (a constant, a lambda, a pattern) needs a node to
 * hold a handle on: a stand-in `add(value)`. Compile splices every reference
 * to a stand-in back to its value (compile/subpatch/splice-aliases), so the
 * stand-in never reaches the program. A copy of it made inside `patch`
 * (`i.x.to(3)`) is a real node and stays.
 */

import { isNodeRef } from "../../graph/input-kinds";
import type { GNode, InputValue } from "../../graph/node";
import { wrap } from "../../patch/handle";
import type { Handle } from "../../patch/handle-data";
import { newNode } from "../../patch/new-node";

export function inputHandles(
	values: Readonly<Record<string, InputValue>>,
	standIns: Map<GNode, InputValue>,
): Record<string, Handle> {
	const handles: Record<string, Handle> = {};
	for (const [port, value] of Object.entries(values)) {
		handles[port] = isNodeRef(value)
			? wrap(value.node, value.port, value.lane)
			: standIn(value, standIns);
	}
	return handles;
}

function standIn(value: InputValue, standIns: Map<GNode, InputValue>): Handle {
	const node = newNode("add", { in: value }, {});
	standIns.set(node, value);
	return wrap(node);
}
