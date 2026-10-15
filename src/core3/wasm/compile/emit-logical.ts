/**
 * `&&`, `||`, `??` and `?:` with JS's short-circuit order. A known left side
 * or test picks its branch while compiling, so the dead branch is never
 * emitted (it may not even make sense: `typeof x === "number" ? x : x[0]`).
 * Two boolean branches give a boolean; otherwise the result is a number
 * (a boolean branch as 0/1), since only one value type can leave an `if`.
 */

import type { ConditionalExpression, LogicalExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { toBool, toF64 } from "./coerce";
import type { Operand } from "./emit-binary";
import { emitExpr, emitStatic } from "./emit-expression";
import type { FnEmitter } from "./fn-emitter";
import { staticOf } from "./static-value";
import type { Kind } from "./values";

export function emitLogical(e: FnEmitter, node: LogicalExpression): Kind {
	const known = staticOf(e, node.left);
	if (known !== null) {
		const v = known.v;
		const takeLeft =
			node.operator === "&&" ? !v : node.operator === "||" ? !!v : v !== undefined && v !== null;
		return takeLeft ? emitStatic(e, v, node.left) : emitExpr(e, node.right);
	}
	// A run-time value is a number or a boolean: never null or undefined.
	if (node.operator === "??") return emitExpr(e, node.left);
	const left = e.capture(() => emitExpr(e, node.left));
	const right = e.capture(() => emitExpr(e, node.right));
	if (left.value === "bool" && right.value === "bool")
		return boolLogical(e, node.operator, left, right);
	return numberLogical(e, node.operator, left, right);
}

export function emitConditional(e: FnEmitter, node: ConditionalExpression): Kind {
	const known = staticOf(e, node.test);
	if (known !== null) return emitExpr(e, known.v ? node.consequent : node.alternate);
	const test = e.capture(() => emitExpr(e, node.test));
	const yes = e.capture(() => emitExpr(e, node.consequent));
	const no = e.capture(() => emitExpr(e, node.alternate));
	const kind: Kind = yes.value === no.value ? yes.value : "f64";
	e.code.append(test.bytes);
	toBool(e, test.value);
	e.enter(OP.if, kind);
	place(e, yes, kind);
	e.else();
	place(e, no, kind);
	e.exit();
	return kind;
}

function boolLogical(e: FnEmitter, op: string, left: Operand, right: Operand): Kind {
	e.code.append(left.bytes);
	e.enter(OP.if, "bool");
	if (op === "&&") e.code.append(right.bytes);
	else e.code.i32Const(1);
	e.else();
	if (op === "&&") e.code.i32Const(0);
	else e.code.append(right.bytes);
	e.exit();
	return "bool";
}

/** `a && b` is `a` when `a` is falsy, else `b`; `a || b` the other way round. */
function numberLogical(e: FnEmitter, op: string, left: Operand, right: Operand): Kind {
	const t = e.local("f64");
	place(e, left, "f64");
	e.code.tee(t);
	toBool(e, "f64");
	e.enter(OP.if, "f64");
	if (op === "&&") place(e, right, "f64");
	else e.code.get(t);
	e.else();
	if (op === "&&") e.code.get(t);
	else place(e, right, "f64");
	e.exit();
	return "f64";
}

function place(e: FnEmitter, operand: Operand, kind: Kind): void {
	e.code.append(operand.bytes);
	if (kind === "f64") toF64(e, operand.value);
}
