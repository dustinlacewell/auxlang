/**
 * Which parameters the function being emitted writes, from the front end's
 * write sites (module/front/scope/writes.ts): by binding, so a write to a
 * shadowing variable of the same name does not count.
 */

import type { FunctionIR } from "../../module/front/module/module-ir";
import { isWritten } from "../../module/front/scope/writes";

/** Whether `fn` writes its parameter `k`. */
export function paramWritten(fn: FunctionIR, k: number): boolean {
	const binding = fn.scopes.params[k];
	return binding !== undefined && isWritten(fn.writes, binding);
}
