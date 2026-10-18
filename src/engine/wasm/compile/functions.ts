/**
 * Every function the module calls, compiled once on first use: helper
 * specialisations (keyed by set, name and argument shapes), auxlang's math
 * and random libraries (one set each, shared by all modules), and the
 * runtime functions.
 */

import type { RawFunction } from "../runtime/raw-function";
import { roundFunction } from "../runtime/round";
import { toInt32Function } from "../runtime/to-int32";
import { compileHelper } from "./compile-helper";
import type { ArgShape, Calls, FnRef } from "./emit-context";
import { valueType } from "./fn-emitter";
import type { FunctionTable } from "./function-table";
import type { HelperSet } from "./helper-set";
import { librarySets } from "./library-sets";

type RuntimeName = Parameters<Calls["runtime"]>[0];

const RAW: Readonly<Record<string, () => RawFunction>> = {
	toInt32: toInt32Function,
	round: roundFunction,
};

export class Functions {
	private readonly compiled = new Map<string, FnRef>();
	/** auxlang's libraries, by helper name prefix: one set each, shared by all modules. */
	private readonly libraries = librarySets().libraries;
	private readonly runtimeSet = librarySets().runtime;

	constructor(private readonly table: FunctionTable) {}

	/** The calls a function in `set` can make. */
	calls(set: HelperSet): Calls {
		return {
			hasHelper: (name) => this.setFor(set, name).fns.has(name),
			helper: (name, shapes) => this.helper(this.setFor(set, name), name, shapes),
			runtime: (name) => this.runtime(name),
		};
	}

	private setFor(set: HelperSet, name: string): HelperSet {
		return this.libraries.find(([prefix]) => name.startsWith(prefix))?.[1] ?? set;
	}

	private helper(set: HelperSet, name: string, shapes: readonly ArgShape[]): FnRef {
		const key = `${set.owner}|${name}|${shapes.map(shapeKey).join(",")}`;
		const known = this.compiled.get(key);
		if (known !== undefined) return known;
		const fn = compileHelper(set, name, shapes, this.calls(set));
		const type = this.table.typeIndex(fn.params, [valueType(fn.result)]);
		const index = this.table.add({ type, locals: fn.locals, body: fn.body });
		const ref: FnRef = { index, hidden: set.cached, result: fn.result };
		this.compiled.set(key, ref);
		return ref;
	}

	private runtime(name: RuntimeName): FnRef {
		const raw = RAW[name];
		if (raw === undefined) {
			const arity = name === "fmod" ? 2 : 1;
			const shapes: ArgShape[] = Array.from({ length: arity }, () => ({ k: "run", kind: "f64" }));
			return this.helper(this.runtimeSet, name, shapes);
		}
		const key = `raw|${name}`;
		const known = this.compiled.get(key);
		if (known !== undefined) return known;
		const fn = raw();
		const type = this.table.typeIndex(fn.params, [fn.result]);
		const index = this.table.add({ type, locals: fn.locals, body: fn.body });
		const ref: FnRef = { index, hidden: false, result: name === "toInt32" ? "int" : "f64" };
		this.compiled.set(key, ref);
		return ref;
	}
}

function shapeKey(s: ArgShape): string {
	if (s.k === "run") return s.kind === "f64" ? "f" : "b";
	if (s.k === "memory") return `m${s.dynamic ? "d" : ""}${s.offset}:${JSON.stringify(s.shape)}`;
	return `s${s.value === undefined ? "u" : JSON.stringify(s.value)}`;
}
