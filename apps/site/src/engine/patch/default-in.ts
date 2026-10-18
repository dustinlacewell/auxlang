/**
 * The input a whole-module connection, a chain or a call on a handle fills. A
 * sub-patch with no inputs has none, so asking is a loud error.
 */

import type { ModulePorts } from "../types";

export function defaultInOf(spec: ModulePorts): string {
	if (spec.defaultIn !== undefined) return spec.defaultIn;
	throw new Error(
		`'${spec.name}' has no inputs, so nothing can be chained, connected or set into it. Call it on its own: it is a self-contained source.`,
	);
}
