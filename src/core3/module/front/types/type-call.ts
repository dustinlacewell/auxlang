/**
 * Calls. An exact host `Math` call on known values folds; any other `Math`
 * call gives a number (an integer range where range-math.ts proves one),
 * and every intrinsic a number. A helper call types the helper
 * for these argument types (helper-plans.ts), as a backend specialises it,
 * and gives what that plan returns.
 */

import type { AnyNode, CallExpression } from "acorn";
import { EXACT_HOST_MATH } from "@/core3/math/exact-host-math";
import { TABLE_INTRINSICS } from "@/core3/module/front/intrinsics/table-intrinsics";
import { helperPlan } from "./helper-plans";
import { rangeOf } from "./int-range";
import type { PlanContext } from "./plan-context";
import { mathRange } from "./range-math";
import { BOOL, NUM, type StaticValue, type Ty, UNKNOWN, emittedTy, int, known, ref } from "./ty";
import { typeExpr } from "./type-expression";

export function typeCall(c: PlanContext, node: CallExpression): Ty {
	const args = node.arguments.map((a) => typeExpr(c, a, "value"));
	const callee = node.callee;
	if (callee.type === "MemberExpression") return mathCall(c, callee, args);
	if (callee.type !== "Identifier" || !c.unbound(callee)) return UNKNOWN;
	if (callee.name === "hashRandom" || TABLE_INTRINSICS.has(callee.name)) return NUM;
	const helper = c.callees(callee.name);
	if (helper === undefined) return UNKNOWN;
	const params = node.arguments.map((a, k) => paramTy(c, a, args[k] as Ty));
	const plan = helperPlan(helper, params);
	if (plan === null) return NUM;
	c.events.push({ k: "call", plan });
	return plan.result === "bool" ? BOOL : NUM;
}

function mathCall(c: PlanContext, callee: AnyNode & { type: "MemberExpression" }, args: Ty[]): Ty {
	const object = callee.object;
	if (object.type !== "Identifier" || c.ir.scopes.references.get(object)?.k !== "math")
		return UNKNOWN;
	if (callee.computed || callee.property.type !== "Identifier") return UNKNOWN;
	const name = callee.property.name;
	if (!EXACT_HOST_MATH.has(name) || !args.every((a) => a.k === "static"))
		return int(mathRange(name, args.map(rangeOf)));
	const values = args.map((a) => (a as { v: StaticValue }).v);
	const fn = Math[name as keyof Math] as (...a: StaticValue[]) => number;
	return known(fn(...values));
}

/**
 * What the helper's parameter is for this argument: the tick's own state
 * record, a known value other than a number, an array or record (named
 * directly inside the helper), or a run-time number or boolean.
 */
function paramTy(c: PlanContext, arg: AnyNode, ty: Ty): Ty {
	if (ty.k === "role" && ty.role === "state" && arg.type === "Identifier" && c.root !== null)
		return ref(c.root.stateRecord);
	if (ty.k === "static" && typeof ty.v !== "number") return ty;
	if (ty.k === "ref") return ref(ty.shape);
	return emittedTy(ty);
}
