/**
 * `=`, compound assignment and `++`/`--` on locals, state fields, outputs
 * and cache slots. A compound assignment reads its target before the right
 * side, as JS does. With `keep`, the assigned value stays on the stack.
 */

import type { AssignmentExpression, UpdateExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { coerce } from "./coerce";
import { combine } from "./emit-binary";
import { emitExpr } from "./emit-expression";
import { beginWrite, endWrite, kindOfTarget, readTarget, targetOf } from "./emit-member";
import type { FnEmitter } from "./fn-emitter";
import type { Kind } from "./values";

export function emitAssignment(
	e: FnEmitter,
	node: AssignmentExpression,
	keep: boolean,
): Kind | null {
	const op = node.operator;
	if (op === "&&=" || op === "||=" || op === "??=")
		return e.fail(node, `${op} is not supported by the WASM backend`);
	const target = targetOf(e, node.left);
	const kind = kindOfTarget(target);
	beginWrite(e, target);
	let value: Kind;
	if (op === "=") value = emitExpr(e, node.right);
	else {
		const current = e.capture(() => readTarget(e, target));
		const right = e.capture(() => emitExpr(e, node.right));
		value = combine(e, op.slice(0, -1), current, right, node);
	}
	coerce(e, value, kind, node);
	endWrite(e, target, keep);
	return keep ? kind : null;
}

export function emitUpdate(e: FnEmitter, node: UpdateExpression, keep: boolean): Kind | null {
	const target = targetOf(e, node.argument);
	if (kindOfTarget(target) !== "f64") return e.fail(node, "++/-- need a number variable");
	beginWrite(e, target);
	readTarget(e, target);
	const old = keep && !node.prefix ? e.local("f64") : null;
	if (old !== null) e.code.tee(old);
	e.code.f64Const(1).op(node.operator === "++" ? OP.f64Add : OP.f64Sub);
	endWrite(e, target, keep && old === null);
	if (old !== null) e.code.get(old);
	return keep ? "f64" : null;
}
