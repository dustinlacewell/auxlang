/**
 * What a module's code is checked against (module-ir.ts `ModuleFacts`), from
 * its spec: its ports, whether it reads a pattern, and a fresh state with
 * the fields the engine injects into every lane
 * (runtime/fresh-node-states.ts). Calls the spec's `state`.
 */

import { groupDecls } from "@/engine/module/group-decls";
import type { ModuleSpec } from "@/engine/types";
import type { ModuleFacts } from "./module-ir";

/** The rate used to build a sample fresh state; shapes do not depend on it. */
const SHAPE_SAMPLE_RATE = 48000;

export function moduleFacts(
	spec: Pick<ModuleSpec, "ins" | "outs" | "state" | "reads" | "config">,
	owner: string,
): ModuleFacts {
	return {
		owner,
		ins: new Set(Object.keys(spec.ins)),
		outs: new Set(Object.keys(spec.outs)),
		inGroups: new Set(groupDecls(spec, "ins").map((g) => g.name)),
		outGroups: new Set(groupDecls(spec, "outs").map((g) => g.name)),
		state: { ...(spec.state?.(SHAPE_SAMPLE_RATE, spec.config ?? {}) ?? {}), __rng: 1, __lane: 0, __seed: 0 },
		tables: spec.reads === "pattern",
	};
}
