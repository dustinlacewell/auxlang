/**
 * A value's truthiness, where JS only tests it: `if`, loops, the test of
 * `?:`, the operand of `!`. There `&&` and `||` test each side in turn, so
 * the sides may mix a boolean and a number (`s.armed && i.trig > 0.5`): the
 * truthiness of `a && b` is that of `a` and then of `b`, in JS's
 * short-circuit order. As a value such a mix has no single WASM type
 * (emit-logical.ts).
 */

import type { AnyNode, LogicalExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { toBool } from "./coerce";
import { emitExpr } from "./emit-expression";
import type { FnEmitter } from "./fn-emitter";
import { staticOf } from "./static-value";

/** Leaves 1 when `node` is truthy, else 0. */
export function emitTest(e: FnEmitter, node: AnyNode): void {
	const known = staticOf(e, node);
	if (known !== null) {
		e.code.i32Const(known.v ? 1 : 0);
		return;
	}
	if (node.type === "LogicalExpression" && node.operator !== "??") logicalTest(e, node);
	else if (node.type === "UnaryExpression" && node.operator === "!") {
		emitTest(e, node.argument);
		e.code.op(OP.i32Eqz);
	} else toBool(e, emitExpr(e, node));
}

function logicalTest(e: FnEmitter, node: LogicalExpression): void {
	const and = node.operator === "&&";
	const left = staticOf(e, node.left);
	if (left !== null) {
		if (and === !!left.v) emitTest(e, node.right);
		else e.code.i32Const(left.v ? 1 : 0);
		return;
	}
	emitTest(e, node.left);
	e.enter(OP.if, "bool");
	if (and) emitTest(e, node.right);
	else e.code.i32Const(1);
	e.else();
	if (and) e.code.i32Const(0);
	else emitTest(e, node.right);
	e.exit();
}
