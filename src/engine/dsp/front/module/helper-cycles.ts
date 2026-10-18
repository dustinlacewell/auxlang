/**
 * Helpers may call helpers, but never in a cycle: a recursive helper has no
 * fixed cost per sample. Fails at the call that closes the first cycle found.
 */

import type { FunctionIR } from "./module-ir";

export function assertNoRecursion(helpers: ReadonlyMap<string, FunctionIR>): void {
	const done = new Set<string>();
	for (const name of helpers.keys()) visit(name, [], helpers, done);
}

function visit(
	name: string,
	stack: string[],
	helpers: ReadonlyMap<string, FunctionIR>,
	done: Set<string>,
): void {
	if (done.has(name)) return;
	const checked = helpers.get(name);
	if (checked === undefined) return;
	stack.push(name);
	for (const call of checked.calls) {
		const at = stack.indexOf(call.name);
		if (at >= 0) {
			const cycle = [...stack.slice(at), call.name].join(" → ");
			checked.fail(call.node, `helpers may not recurse (${cycle})`);
		}
		visit(call.name, stack, helpers, done);
	}
	stack.pop();
	done.add(name);
}
