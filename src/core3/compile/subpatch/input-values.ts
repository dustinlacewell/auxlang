/**
 * The value at each input of a sub-patch instance, as its inner graph sees
 * it: the set value (already unit-converted at the outer port), else the
 * declared default; `.mod` terms add on top (compile/expand-mods). A required
 * input with no value is a loud error, as for any module.
 */

import type { GNode, InputValue } from "../../graph/node";
import type { SubpatchSpec } from "../../patch/subpatch/subpatch-spec";
import type { PortAnn } from "../../types";
import { modulated } from "../expand-mods";

export function inputValues(instance: GNode, spec: SubpatchSpec): Record<string, InputValue> {
	const values: Record<string, InputValue> = {};
	for (const [port, ann] of Object.entries(spec.ins)) {
		values[port] = portValue(instance, port, ann);
	}
	return values;
}

function portValue(instance: GNode, port: string, ann: PortAnn): InputValue {
	const terms = instance.mods?.[port];
	if (terms !== undefined) return modulated(instance, port, () => ann, terms);
	const set = instance.inputs[port];
	if (set !== undefined) return set;
	if (ann.def === null) {
		throw new Error(
			`${instance.module}.${port} is required but unconnected. Connect a signal to '${port}'.`,
		);
	}
	return ann.def;
}
