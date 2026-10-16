/**
 * The arrays of records whose elements a plan rebinds (`s.voices[0] =
 * s.voices[1]`): the type key (ty.ts `tyKey`) of each such array, from the
 * tick's stores and those of every helper plan it calls. An element then
 * names whichever record was stored there last, so a backend that lays
 * state out in memory keeps a pointer per element for every array of that
 * type, and none for any other.
 */

import type { FunctionPlan } from "./function-plan";
import { ref, tyKey } from "./ty";

export function elementRebinds(plan: FunctionPlan): ReadonlySet<string> {
	const keys = new Set<string>();
	collect(plan, keys, new Set());
	return keys;
}

function collect(plan: FunctionPlan, keys: Set<string>, seen: Set<FunctionPlan>): void {
	seen.add(plan);
	for (const event of plan.events) {
		if (event.k === "call") {
			if (!seen.has(event.plan)) collect(event.plan, keys, seen);
			continue;
		}
		if (event.k !== "store" || event.place.k !== "ref") continue;
		const target = event.node.type === "AssignmentExpression" ? event.node.left : null;
		if (target?.type !== "MemberExpression" || !target.computed) continue;
		const owner = plan.typeOf(target.object);
		if (owner.k === "ref" && owner.shape.k === "records") keys.add(tyKey(ref(owner.shape)));
	}
}
