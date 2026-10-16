/**
 * Port groups reach the patch and compile layers first (per-node ports card,
 * step 2a). An engine that cannot run a node with group members yet refuses it
 * here, loudly; steps 2b (interpreter) and 2c (WASM) remove their call.
 */

import type { PNode } from "../types";

export function assertNoPortGroups(node: PNode, engine: string): void {
	if (node.groups === undefined) return;
	throw new Error(
		`'${node.module}' has port group members [${Object.keys(node.groups).join(", ")}]: ` +
			`port groups are not built yet in the ${engine} engine`,
	);
}
