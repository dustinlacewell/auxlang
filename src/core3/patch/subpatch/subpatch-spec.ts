/**
 * A sub-patch module (MANIFESTO §5): the port surface of any module, plus the
 * `patch` function that builds its inner graph. It never reaches the engine:
 * compile expands each instance into plain nodes (compile/expand-subpatches).
 */

import type { ModulePorts } from "../../types";
import type { Handle } from "../handle-data";

export interface SubpatchSpec extends ModulePorts {
	/** One handle per input in; a record with one value per output out. */
	readonly patch: (ins: Readonly<Record<string, Handle>>) => unknown;
}

export type SubpatchTable = ReadonlyMap<string, SubpatchSpec>;
