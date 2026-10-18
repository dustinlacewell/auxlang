/** The name of a non-computed object key: `cutoff` in `{ cutoff: 800 }` or `{ "cutoff": 800 }`. */

import type { AnyNode } from "acorn";

export function keyName(key: AnyNode): string | null {
	if (key.type === "Identifier") return key.name;
	if (key.type === "Literal" && typeof key.value === "string") return key.value;
	return null;
}
