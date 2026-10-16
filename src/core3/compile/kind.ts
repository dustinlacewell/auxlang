/**
 * A node's kind for re-eval MATCHING (runtime/match.ts) — not a code cache
 * key; code is always found fresh through `node.module` in the current
 * program's specs (module/resolve.ts), so an edited tick always runs under
 * its new source regardless of kind.
 *
 * A shape-C module (`spec.writes` defined, MANIFESTO §5.1) keeps its kind as
 * just its module name: editing its setup or tick is not a re-eval identity
 * change, so its running node still matches and the per-field carry rule
 * (module/front/state/carry-fields.ts) decides what state survives. An
 * old-form module (`writes` undefined) folds in a hash of its tick and state
 * source, so a changed tick is a different machine and never takes the old
 * one's state (today's behavior, unchanged).
 */

import type { GNode } from "../graph/node";
import { fnv1aHex } from "../hash/fnv1a-hex";
import type { SpecTable } from "../module/resolve";

export function kindOf(node: GNode, specs: SpecTable): string {
	const spec = specs.get(node.module);
	if (spec === undefined || spec.writes !== undefined) return node.module;
	return `${node.module}#${fnv1aHex(spec.tick.toString() + (spec.state?.toString() ?? ""))}`;
}
