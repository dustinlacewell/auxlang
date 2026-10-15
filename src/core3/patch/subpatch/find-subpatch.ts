/**
 * Sub-patch lookup by module name: the root-scope table, then an eval's own.
 * Undefined when the name is not a sub-patch (it may be a tick module).
 */

import { rootSubpatches } from "./registry";
import type { SubpatchSpec, SubpatchTable } from "./subpatch-spec";

export function findSubpatch(
	name: string,
	evalTable: SubpatchTable | null | undefined,
): SubpatchSpec | undefined {
	return rootSubpatches().get(name) ?? evalTable?.get(name);
}
