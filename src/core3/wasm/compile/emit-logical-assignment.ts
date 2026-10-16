/**
 * `a &&= b`, `a ||= b`, `a ??= b` with JS's order: find the place `a` once,
 * read it, and evaluate and store `b` only when the test passes. A known
 * `a` picks the branch while compiling. Only an array element at an invalid
 * index is nullish, and a store there does nothing, so `??=` runs `b` for
 * its effects alone. The value is `a` or `b`: a boolean when both are, else
 * a number (front/types/type-expression.ts types it so).
 */

import type { AssignmentExpression } from "acorn";
import { keepsLeft } from "../../module/front/types/keeps-left";
import { OP } from "../encode/opcodes";
import { emitRebind } from "./address-variable";
import { toBool, toF64 } from "./coerce";
import { writeTarget } from "./emit-assignment";
import { emitExpr, emitStatic } from "./emit-expression";
import { type Target, readTarget, targetOf } from "./emit-member";
import type { FnEmitter } from "./fn-emitter";
import { placeOf } from "./place";
import { emitPointerRebind, isPointerRebind } from "./pointer-slot";
import type { Kind } from "./values";

export function emitLogicalAssignment(e: FnEmitter, node: AssignmentExpression, keep: boolean): Kind | null {
	const op = node.operator.slice(0, -1);
	if (e.typeOf(node.left).k === "ref") return refAssign(e, node, op, keep);
	const known = e.fold(node.left);
	if (known !== null && keepsLeft(op, known.v)) return keep ? emitStatic(e, known.v, node.left) : null;
	const target = targetOf(e, node.left);
	if (known !== null) return asResult(e, writeTarget(e, target, keep, () => emitExpr(e, node.right), node));
	if (op === "??") return nullishAssign(e, node, target, keep);
	return testedAssign(e, node, target, op === "||", keep);
}

/**
 * On an array or record variable, field or element: it is truthy and never
 * nullish, so `&&=` always rebinds it and `||=`/`??=` only find it (the
 * owner's code runs, as JS evaluates it). The plan refuses its value where
 * it counts (front/types/type-expression.ts).
 */
function refAssign(e: FnEmitter, node: AssignmentExpression, op: string, keep: boolean): null {
	if (keep) return e.fail(node, "a logical assignment of an array or record is used as a value");
	if (op !== "&&") placeOf(e, node.left);
	else if (isPointerRebind(e, node)) emitPointerRebind(e, node);
	else emitRebind(e, node);
	return null;
}

/** `a ??= b`: `a`, or `b` where `a` is an element at an invalid index. */
function nullishAssign(e: FnEmitter, node: AssignmentExpression, target: Target, keep: boolean): Kind | null {
	const kind = readTarget(e, target, () => emitExpr(e, node.right));
	if (!keep) {
		e.code.op(OP.drop);
		return null;
	}
	toF64(e, kind);
	return "f64";
}

/** `a &&= b` stores `b` when `a` is truthy; `a ||= b` when it is falsy. */
function testedAssign(
	e: FnEmitter,
	node: AssignmentExpression,
	target: Target,
	whenFalsy: boolean,
	keep: boolean,
): Kind | null {
	const current = readTarget(e, target);
	const assign = e.capture(() => writeTarget(e, target, keep, () => emitExpr(e, node.right), node));
	const both = current === "bool" && assign.value === "bool";
	const result: Kind | null = keep ? (both ? "bool" : "f64") : null;
	const old = keep ? e.local(current) : null;
	if (old !== null) e.code.tee(old);
	toBool(e, current);
	if (whenFalsy) e.code.op(OP.i32Eqz);
	e.enter(OP.if, result);
	e.code.append(assign.bytes);
	if (result === "f64") toF64(e, assign.value as Kind);
	if (old !== null) {
		e.else();
		e.code.get(old);
		if (result === "f64") toF64(e, current);
	}
	e.exit();
	return result;
}

/** A kept value as the plan types it: a boolean, or a number with no integer range. */
function asResult(e: FnEmitter, kind: Kind | null): Kind | null {
	if (kind === null || kind === "bool") return kind;
	toF64(e, kind);
	return "f64";
}
