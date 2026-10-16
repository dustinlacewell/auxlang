/**
 * Which variables the function being emitted writes, from the front end's
 * write sites (module/front/scope/writes.ts): by binding, so a write to a
 * shadowing variable of the same name does not count.
 */

import type { AnyNode, Identifier } from "acorn";
import type { FunctionIR } from "../../module/front/module/module-ir";
import { bindingDeclaredBy } from "../../module/front/scope/binding";
import { isWritten } from "../../module/front/scope/writes";
import type { FnEmitter } from "./fn-emitter";

/** The function being emitted; a loud error in the render function, which has no source. */
export function functionOf(e: FnEmitter, at: AnyNode): FunctionIR {
	const fn = e.ctx.fn;
	if (fn === null) return e.fail(at, "this code has no front end reading");
	return fn;
}

/** Whether `fn` writes its parameter `k`. */
export function paramWritten(fn: FunctionIR, k: number): boolean {
	const binding = fn.scopes.params[k];
	return binding !== undefined && isWritten(fn.writes, binding);
}

/** Whether the variable `id` declares is written after its declaration. */
export function declaredWritten(e: FnEmitter, id: Identifier): boolean {
	const fn = functionOf(e, id);
	const binding = bindingDeclaredBy(fn.scopes, id);
	if (binding === undefined) return e.fail(id, `'${id.name}' has no binding`);
	return isWritten(fn.writes, binding);
}
