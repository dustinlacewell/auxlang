/**
 * One plan's walk in progress: the function and what it is specialised on,
 * the type of each node walked so far and of each variable declared so far,
 * which nodes name a value directly, and what the kind check will judge.
 */

import type { AnyNode, Identifier } from "acorn";
import type { FunctionIR } from "@/core3/module/front/module/module-ir";
import { bindingDeclaredBy, bindingOf } from "@/core3/module/front/scope/binding";
import type { Binding } from "@/core3/module/front/scope/binding";
import { isWritten } from "@/core3/module/front/scope/writes";
import type { Callees } from "./callees";
import type { PlanEvent, Returned } from "./plan-events";
import type { TickRoot } from "./tick-root";
import type { Ty } from "./ty";

/** `value`: the value is kept or used. `loose`: only its truthiness counts, or nothing. */
export type Position = "value" | "loose";

export class PlanContext {
	readonly types = new Map<AnyNode, Ty>();
	/**
	 * Nodes that name a value with no run-time code to find it: a variable,
	 * a parameter record's field, a field or constant-index element of state
	 * reached that way. Only these fold `typeof` and lengths, and look into
	 * their fields.
	 */
	readonly paths = new Set<AnyNode>();
	/** Typed-array elements at a constant index in bounds, reached by a path: `typeof` folds them. */
	readonly elements = new Set<AnyNode>();
	readonly events: PlanEvent[] = [];
	readonly returns: Returned[] = [];
	private readonly vars = new Map<Binding, Ty>();

	constructor(
		readonly ir: FunctionIR,
		/** The tick's parameter records; null in a helper or a lambda. */
		readonly root: TickRoot | null,
		readonly callees: Callees,
	) {}

	/** The type of the variable `id` names, when it is declared by now. */
	varTy(id: Identifier): Ty | undefined {
		const binding = bindingOf(this.ir.scopes, id);
		return binding === undefined ? undefined : this.vars.get(binding);
	}

	/** `id` names no variable declared by now: a global, `Math`, a helper or an intrinsic. */
	unbound(id: Identifier): boolean {
		return this.varTy(id) === undefined;
	}

	/** Declares the variable `id` names, of type `ty`; the plan records `ty` at `id`. */
	declare(id: Identifier, ty: Ty): void {
		this.types.set(id, ty);
		const binding = bindingDeclaredBy(this.ir.scopes, id);
		if (binding !== undefined) this.vars.set(binding, ty);
	}

	/** From here on, reads of the variable `id` declares are of type `ty` (a loop counter in its body). */
	narrow(id: Identifier, ty: Ty): void {
		const binding = bindingDeclaredBy(this.ir.scopes, id);
		if (binding !== undefined) this.vars.set(binding, ty);
	}

	/** The variable `id` declares is written after its declaration. */
	written(id: Identifier): boolean {
		const binding = bindingDeclaredBy(this.ir.scopes, id);
		return binding === undefined || isWritten(this.ir.writes, binding);
	}

	bindParam(binding: Binding, ty: Ty): void {
		this.vars.set(binding, ty);
	}
}
