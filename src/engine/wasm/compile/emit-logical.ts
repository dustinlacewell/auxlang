/**
 * `&&`, `||`, `??` and `?:` with JS's short-circuit order. A known left side
 * or test picks its branch while compiling, so the dead branch is never
 * emitted (it may not even make sense: `typeof x === "number" ? x : x[0]`).
 * Two boolean branches give a boolean, a `?:` with an integer range an
 * integer of its width; otherwise the result is a number (a boolean branch as 0/1), since
 * only one value type can leave an `if`.
 * The checker (module/front/kinds/) allows a mix only where truthiness alone
 * counts, so the 0/1 never shows.
 */

import type { AnyNode, ConditionalExpression, LogicalExpression } from "acorn";
import { keepsLeft } from "../../dsp/front/types/keeps-left";
import { OP } from "../encode/opcodes";
import { toBool, toF64 } from "./coerce";
import type { Operand } from "./emit-binary";
import { emitExpr, emitStatic } from "./emit-expression";
import { emitInteger, integerWidth } from "./emit-int";
import { emitNullish } from "./emit-member";
import { emitTest } from "./emit-test";
import type { FnEmitter } from "./fn-emitter";
import type { Kind } from "./values";

export function emitLogical(e: FnEmitter, node: LogicalExpression): Kind {
	const known = e.fold(node.left);
	if (known !== null)
		return keepsLeft(node.operator, known.v) ? emitStatic(e, known.v, node.left) : emitExpr(e, node.right);
	// Only an array element at an invalid index is nullish at run time.
	if (node.operator === "??") return emitNullish(e, node.left, () => emitExpr(e, node.right));
	const left = e.capture(() => emitExpr(e, node.left));
	const right = e.capture(() => emitExpr(e, node.right));
	if (left.value === "bool" && right.value === "bool")
		return boolLogical(e, node.operator, left, right);
	return numberLogical(e, node.operator, left, right);
}

export function emitConditional(e: FnEmitter, node: ConditionalExpression): Kind {
	const known = e.fold(node.test);
	if (known !== null) return emitExpr(e, known.v ? node.consequent : node.alternate);
	const test = e.capture(() => emitTest(e, node.test));
	const width = integerWidth(e, node);
	const branch = (arm: AnyNode): Kind => {
		if (width === null) return emitExpr(e, arm);
		emitInteger(e, arm, width);
		return width;
	};
	const yes = e.capture(() => branch(node.consequent));
	const no = e.capture(() => branch(node.alternate));
	const kind: Kind = yes.value === no.value ? yes.value : "f64";
	e.code.append(test.bytes);
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
