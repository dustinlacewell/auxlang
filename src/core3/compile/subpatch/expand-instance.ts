/**
 * One sub-patch instance → its inner graph. The instance's input values become
 * handles, `patch` runs in the instance's own scope (every node it builds
 * carries the scope, so identity nests them under the instance), and the
 * returned record becomes the value each output port stands for.
 *
 * `.id()`, `.seed()` and `.width()` on an instance are loud errors: what they
 * mean for the inner nodes is not decided yet.
 */

import type { GNode, InputValue } from "../../graph/node";
import { type Scope, scopeChain } from "../../graph/scope";
import { type EvalResult, runInScope } from "../../patch/context";
import type { SubpatchSpec } from "../../patch/subpatch/subpatch-spec";
import { inputHandles } from "./input-handles";
import { inputValues } from "./input-values";
import { outputValues } from "./output-values";

export interface Expansion {
	/** Each output port → the inner value it stands for. */
	readonly outputs: Readonly<Record<string, InputValue>>;
	/** Each stand-in node (compile/subpatch/input-handles) → the value it stands for. */
	readonly standIns: ReadonlyMap<GNode, InputValue>;
}

export function expandInstance(instance: GNode, spec: SubpatchSpec, base: EvalResult): Expansion {
	assertPlainInstance(instance);
	const values = inputValues(instance, spec);
	const scope = instanceScope(instance, spec);
	return runInScope(base, scope, () => {
		const standIns = new Map<GNode, InputValue>();
		const returned = spec.patch(Object.freeze(inputHandles(values, standIns)));
		return { outputs: outputValues(spec, returned), standIns };
	});
}

function instanceScope(instance: GNode, spec: SubpatchSpec): Scope {
	if (scopeChain(instance.scope).some((s) => s.module === spec.name)) {
		throw new Error(`sub-patch '${spec.name}' contains itself. A sub-patch cannot recurse.`);
	}
	return { module: spec.name, ...(instance.scope ? { parent: instance.scope } : {}) };
}

function assertPlainInstance(instance: GNode): void {
	const where = `sub-patch '${instance.module}'`;
	if (instance.pin !== undefined) {
		throw new Error(`${where}: .id() on a sub-patch is not supported. Pin a module inside it.`);
	}
	if (instance.seed !== undefined) {
		throw new Error(`${where}: .seed() on a sub-patch is not supported. Seed a module inside it.`);
	}
	const config = Object.keys(instance.config);
	if (config.includes("__width")) {
		throw new Error(
			`${where}: .width() on a sub-patch is not supported. Set it on a module inside.`,
		);
	}
	if (config.length > 0) {
		throw new Error(`${where}: a sub-patch takes no config (got [${config.join(", ")}])`);
	}
}
