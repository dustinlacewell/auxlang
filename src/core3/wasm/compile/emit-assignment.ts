/**
 * `=`, compound assignment and `++`/`--` on locals, state fields, outputs,
 * cache slots and array elements (`&&=`, `||=`, `??=` are
 * emit-logical-assignment.ts). A compound assignment reads its target
 * before the right side, as JS does. With `keep`, the assigned value stays
 * on the stack. An int local that is written is a loop counter
 * (front/types/loop-counter.ts): only its
 * step writes it, in i32, and the counter's range says the step cannot
 * leave int32.
 */

import type { AnyNode, AssignmentExpression, UpdateExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { emitRebind, isRebind } from "./address-variable";
import { coerce, toF64 } from "./coerce";
import { combine } from "./emit-binary";
import { emitExpr } from "./emit-expression";
import { emitInt, isInt } from "./emit-int";
import { emitLogicalAssignment } from "./emit-logical-assignment";
import {
	type Target,
	beginWrite,
	endWrite,
	kindToStore,
	readTarget,
	targetOf,
} from "./emit-member";
import type { FnEmitter } from "./fn-emitter";
import { emitPointerRebind, isPointerRebind } from "./pointer-slot";
import type { Kind } from "./values";

export function emitAssignment(
	e: FnEmitter,
	node: AssignmentExpression,
	keep: boolean,
): Kind | null {
	const op = node.operator;
	if (op === "&&=" || op === "||=" || op === "??=") return emitLogicalAssignment(e, node, keep);
	if (isRebind(e, node) || isPointerRebind(e, node)) return rebind(e, node, keep);
	const target = targetOf(e, node.left);
	if (target.k === "local" && target.kind === "int") return stepCounter(e, node, target, keep);
	if (op === "=") return writeTarget(e, target, keep, () => emitExpr(e, node.right), node);
	return writeTarget(e, target, keep, () => {
		const current = e.capture(() => readTarget(e, target));
		const right = e.capture(() => emitExpr(e, node.right));
		return combine(e, op.slice(0, -1), current, right, node);
	}, node);
}

/**
 * Stores the value `emitValue` leaves into `target`; with `keep`, the stored
 * value stays on the stack. A boolean stored in an array element stays a
 * boolean, as in JS: the expression's value is the one assigned.
 */
export function writeTarget(
	e: FnEmitter,
	target: Target,
	keep: boolean,
	emitValue: () => Kind,
	at: AnyNode,
): Kind | null {
	beginWrite(e, target);
	const value = emitValue();
	const kind = kindToStore(target, value);
	const assigned = keep && value === "bool" && kind !== "bool" ? e.local("bool") : null;
	if (assigned !== null) e.code.tee(assigned);
	coerce(e, value, kind, at);
	endWrite(e, target, keep && assigned === null, kind);
	if (assigned === null) return keep ? kind : null;
	e.code.get(assigned);
	return "bool";
}

export function emitUpdate(e: FnEmitter, node: UpdateExpression, keep: boolean): Kind | null {
	const target = targetOf(e, node.argument);
	const kind = target.k === "local" ? target.kind : "f64";
	if (kind === "bool") return e.fail(node, "++/-- need a number variable");
	if (kind === "long") return e.fail(node, "an i64 variable is never written (compiler bug)");
	const int = kind === "int";
	beginWrite(e, target);
	const current = readTarget(e, target);
	if (!int) toF64(e, current);
	const old = keep && !node.prefix ? e.local(kind) : null;
	if (old !== null) e.code.tee(old);
	if (int) e.code.i32Const(1).op(node.operator === "++" ? OP.i32Add : OP.i32Sub);
	else e.code.f64Const(1).op(node.operator === "++" ? OP.f64Add : OP.f64Sub);
	endWrite(e, target, keep && old === null, kind);
	if (old !== null) e.code.get(old);
	return keep ? kind : null;
}

/**
 * `a = s.b` on an array variable, `s.a = s.b` on a field, `s.voices[0] = s.voices[1]`
 * on an element; its value is only ever used as a place (place.ts).
 */
function rebind(e: FnEmitter, node: AssignmentExpression, keep: boolean): null {
	if (keep) return e.fail(node, "an array rebind is used as a number (compiler bug)");
	if (isPointerRebind(e, node)) emitPointerRebind(e, node);
	else emitRebind(e, node);
	return null;
}

/** `i += k` / `i -= k` on a loop counter, with an int32 step. */
function stepCounter(
	e: FnEmitter,
	node: AssignmentExpression,
	target: Target & { k: "local" },
	keep: boolean,
): Kind | null {
	const op = node.operator === "+=" ? OP.i32Add : node.operator === "-=" ? OP.i32Sub : null;
	if (op === null || !isInt(e, node.right))
		return e.fail(node, "an integer loop counter only steps by an integer (compiler bug)");
	e.code.get(target.index);
	emitInt(e, node.right);
	e.code.op(op);
	endWrite(e, target, keep, "int");
	return keep ? "int" : null;
}
