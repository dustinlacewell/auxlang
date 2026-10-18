/**
 * One specialisation of a function, typed once for every engine: the type
 * of each node a backend emits, what folds while compiling, what the kind
 * check judges, and whether it returns booleans. A tick is planned for its
 * root (tick-root.ts), a helper for its argument types, a lambda for its
 * fixed parameters.
 */

import type { AnyNode } from "acorn";
import type { FunctionIR } from "../module/module-ir";
import { isWritten } from "../scope/writes";
import type { Callees } from "./callees";
import { PlanContext } from "./plan-context";
import type { PlanEvent, Returned } from "./plan-events";
import type { TickRoot } from "./tick-root";
import { type Folded, type Ty, emittedClass, emittedTy, known } from "./ty";
import { typeNumeric } from "./type-numeric";
import { walkStatements } from "./walk-statements";

export interface FunctionPlan {
	readonly ir: FunctionIR;
	readonly params: readonly Ty[];
	readonly events: readonly PlanEvent[];
	readonly returns: readonly Returned[];
	/** `bool` when every return gives a boolean (and there is one); else a number. */
	readonly result: "num" | "bool";
	/** The type of a node a backend emits; throws for a node the plan never walked. */
	typeOf(node: AnyNode): Ty;
	/** The node's value when it is known while compiling. */
	fold(node: AnyNode): Folded | null;
}

const ROLES: readonly Ty[] = (["state", "ins", "outs", "config"] as const).map((role) => ({
	k: "role",
	role,
}));

export function tickPlan(ir: FunctionIR, root: TickRoot, callees: Callees): FunctionPlan {
	return planFunction(ir, [...ROLES, root.sampleRate, root.width], root, callees);
}

export function planFunction(
	ir: FunctionIR,
	params: readonly Ty[],
	root: TickRoot | null,
	callees: Callees,
): FunctionPlan {
	const c = new PlanContext(ir, root, callees);
	bindParams(c, params);
	const body = ir.node.body;
	if (body.type === "BlockStatement") walkStatements(c, body.body);
	else c.returns.push({ at: body, ty: typeNumeric(c, body, "value") });
	return finished(c, params);
}

/** A parameter the function writes holds a run-time value; a missing argument is `undefined`. */
function bindParams(c: PlanContext, params: readonly Ty[]): void {
	c.ir.scopes.params.forEach((binding, k) => {
		if (binding === undefined) return;
		const ty = params[k] ?? known(undefined);
		const written = ty.k === "static" && isWritten(c.ir.writes, binding);
		c.bindParam(binding, written ? emittedTy(ty) : ty);
	});
}

function finished(c: PlanContext, params: readonly Ty[]): FunctionPlan {
	const types = c.types;
	const typeOf = (node: AnyNode): Ty => {
		const ty = types.get(node);
		if (ty === undefined) throw new Error(`${c.ir.kind} plan: a node it never walked (${node.type})`);
		return ty;
	};
	return {
		ir: c.ir,
		params,
		events: c.events,
		returns: c.returns,
		result: resultOf(c.returns),
		typeOf,
		fold: (node) => {
			const ty = typeOf(node);
			return ty.k === "static" ? { v: ty.v } : null;
		},
	};
}

/** A bare `return;` gives `undefined`: a number. */
function resultOf(returns: readonly Returned[]): "num" | "bool" {
	const bool = returns.length > 0 && returns.every((r) => r.ty !== null && emittedClass(r.ty) === "bool");
	return bool ? "bool" : "num";
}
