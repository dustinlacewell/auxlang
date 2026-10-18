/**
 * What a sub-patch's `patch` returned, checked: a record with exactly the
 * declared outputs, each a signal value (a handle, a number, a lambda or a
 * pattern). Anything else is a loud error naming what was expected.
 */

import { nodePorts } from "../../dsp/node-ports";
import type { InputValue } from "../../graph/node";
import { isHandle } from "../../patch/handle-data";
import { lift } from "../../patch/lift";
import type { SubpatchSpec } from "../../patch/subpatch/subpatch-spec";

export function outputValues(spec: SubpatchSpec, returned: unknown): Record<string, InputValue> {
	const declared = Object.keys(nodePorts(spec).outs);
	if (typeof returned !== "object" || returned === null || isHandle(returned)) {
		throw new Error(
			`sub-patch '${spec.name}': patch must return a record of outputs [${declared.join(", ")}]`,
		);
	}
	const record = returned as Record<string, unknown>;
	assertSameKeys(spec.name, Object.keys(record), declared);
	const values: Record<string, InputValue> = {};
	for (const port of declared) values[port] = lift(record[port], `${spec.name}.${port}`);
	return values;
}

function assertSameKeys(
	name: string,
	returned: readonly string[],
	declared: readonly string[],
): void {
	const same =
		returned.length === declared.length && declared.every((port) => returned.includes(port));
	if (same) return;
	throw new Error(
		`sub-patch '${name}': patch returned [${returned.join(", ")}], ` +
			`but outs declare [${declared.join(", ")}]. They must be the same.`,
	);
}
