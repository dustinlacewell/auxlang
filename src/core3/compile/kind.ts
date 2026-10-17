/**
 * A node's kind for re-eval MATCHING (runtime/match.ts) — not a code cache
 * key; code is always found fresh through `node.module` in the current
 * program's specs (module/resolve.ts), so an edited tick always runs under
 * its new source regardless of kind.
 *
 * Every module's kind is just its name: editing its setup or tick is not a
 * re-eval identity change (MANIFESTO §7, "a module's code is not its
 * identity"), so its running node still matches and the per-field carry rule
 * (module/front/state/carry-fields.ts), keyed by `ModuleSpec.writes`,
 * decides what state survives.
 */

import type { GNode } from "../graph/node";

export function kindOf(node: GNode): string {
	return node.module;
}
