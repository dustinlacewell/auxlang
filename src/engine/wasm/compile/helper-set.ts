/**
 * A set of helpers that call each other by name, as read by the front end:
 * one module's helpers, auxlang's math or random library, the runtime
 * functions, or one signal lambda. `cached`: the set's helpers use the math
 * call cache, so each takes the cache address as a hidden first parameter.
 */

import type { FunctionIR } from "../../module/front/module/module-ir";
import { cacheSlotsIn } from "./cache-slots";

export interface HelperSet {
	/** Names the set in errors and keys its compiled functions. */
	readonly owner: string;
	readonly fns: ReadonlyMap<string, FunctionIR>;
	readonly cached: boolean;
}

export function helperSet(owner: string, fns: ReadonlyMap<string, FunctionIR>): HelperSet {
	return { owner, fns, cached: [...fns.values()].some((fn) => cacheSlotsIn([fn.node]) > 0) };
}
