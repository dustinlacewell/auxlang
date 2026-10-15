/**
 * One sub-patch instance → its inner graph. The instance's input values become
 * handles, `patch` runs in the instance's own scope (every node it builds
 * carries the scope, so identity nests them under the instance), and the
 * returned record becomes the value each output port stands for.
 *
 * The instance's `.id()` and `.seed()` go on its scope (graph/scope): the pin
 * roots the inner places, the seed seeds every inner node. `.width()` is a
 * loud error: a sub-patch has no lanes of its own to set.
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
	return {
		module: spec.name,
		...(instance.scope ? { parent: instance.scope } : {}),
		...(instance.pin !== undefined ? { pin: instance.pin } : {}),
		...(instance.seed !== undefined ? { seed: instance.seed } : {}),
	};
}

function assertPlainInstance(instance: GNode): void {
	const where = `sub-patch '${instance.module}'`;
	const config = Object.keys(instance.config);
	if (config.includes("__width")) {
		throw new Error(
			`${where}: .width() does not apply. A sub-patch has no lanes of its own: its width comes from its inputs. Set .width() on a module inside it.`,
		);
	}
	if (config.length > 0) {
		throw new Error(`${where}: a sub-patch takes no config (got [${config.join(", ")}])`);
	}
}
