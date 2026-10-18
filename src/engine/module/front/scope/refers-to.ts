/** Whether code inside `node` refers to `binding` (a reference, not a property name). */

import type { AnyNode } from "acorn";
import { walk } from "@/engine/module/front/parse/walk";
import { type Binding, type Scopes, bindingOf } from "./binding";

export function refersTo(scopes: Scopes, node: AnyNode, binding: Binding): boolean {
	let found = false;
	walk(node, (n) => {
		if (!found && n.type === "Identifier" && bindingOf(scopes, n) === binding) found = true;
	});
	return found;
}
