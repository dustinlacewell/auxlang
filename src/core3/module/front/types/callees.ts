/**
 * The helpers a function can call by name: a name with a library's prefix
 * is that library's (library-irs.ts), any other name one of the function's
 * own set (its module's helpers, a library's own functions). Each callee
 * carries the callees it can reach in turn.
 */

import type { FunctionIR } from "@/core3/module/front/module/module-ir";
import { libraryFor } from "@/core3/module/front/module/library-irs";

export interface Callee {
	readonly ir: FunctionIR;
	readonly callees: Callees;
}

export type Callees = (name: string) => Callee | undefined;

const memo = new WeakMap<ReadonlyMap<string, FunctionIR>, Callees>();

export function calleesOf(fns: ReadonlyMap<string, FunctionIR>): Callees {
	let callees = memo.get(fns);
	if (callees === undefined) {
		callees = (name) => {
			const set = libraryFor(name)?.fns ?? fns;
			const ir = set.get(name);
			return ir === undefined ? undefined : { ir, callees: calleesOf(set) };
		};
		memo.set(fns, callees);
	}
	return callees;
}
