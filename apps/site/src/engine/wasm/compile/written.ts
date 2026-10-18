/**
 * Which parameters and variables the function being emitted writes, from the front end's
 * write sites (module/front/scope/writes.ts): by binding, so a write to a
 * shadowing variable of the same name does not count.
 */

import type { Identifier } from "acorn";
import type { FunctionIR } from "../../dsp/front/module/module-ir";
import { bindingDeclaredBy, bindingOf } from "../../dsp/front/scope/binding";
import { isWritten } from "../../dsp/front/scope/writes";

/** Whether `fn` writes the variable `id` declares after its declaration. */
export function variableWritten(fn: FunctionIR, id: Identifier): boolean {
	const binding = bindingDeclaredBy(fn.scopes, id);
	return binding !== undefined && isWritten(fn.writes, binding);
}

/** Whether `fn` writes the variable the reference `use` names after its declaration. */
export function referenceWritten(fn: FunctionIR, use: Identifier): boolean {
	const binding = bindingOf(fn.scopes, use);
	return binding !== undefined && isWritten(fn.writes, binding);
}

/** Whether `fn` writes its parameter `k`. */
export function paramWritten(fn: FunctionIR, k: number): boolean {
	const binding = fn.scopes.params[k];
	return binding !== undefined && isWritten(fn.writes, binding);
}
