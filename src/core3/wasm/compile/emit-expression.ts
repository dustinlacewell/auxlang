/**
 * Expressions: fold what is known, then emit by node type. Each emitter
 * leaves one value on the stack and returns its kind; `emitDiscard` emits an
 * expression for its effects only.
 */

import type { AnyNode, Expression, SequenceExpression, UnaryExpression } from "acorn";
import { OP } from "../encode/opcodes";
import { toF64, toInt32 } from "./coerce";
import { emitAssignment, emitUpdate } from "./emit-assignment";
import { emitBinary } from "./emit-binary";
import { emitCall } from "./emit-call";
import { emitInteger, integerWidth } from "./emit-int";
import { emitConditional, emitLogical } from "./emit-logical";
import { emitMemberRead } from "./emit-member";
import { emitTest } from "./emit-test";
import type { FnEmitter } from "./fn-emitter";
import { agreed } from "./plan-agreement";
import type { StaticValue } from "../../module/front/types/ty";
import type { Kind, Value } from "./values";

/** Emits `node`'s value and returns its kind, which the plan's type must agree with. */
export function emitExpr(e: FnEmitter, node: AnyNode): Kind {
	return agreed(e, node, emitNode(e, node));
}

function emitNode(e: FnEmitter, node: AnyNode): Kind {
	const folded = e.fold(node);
	if (folded !== null) return emitStatic(e, folded.v, node);
	switch (node.type) {
		case "Identifier":
			return emitValue(e, e.scope.lookup(node.name), node);
		case "MemberExpression":
			return emitMemberRead(e, node);
		case "UnaryExpression":
			return emitUnary(e, node);
		case "BinaryExpression":
			return emitBinary(e, node);
		case "LogicalExpression":
			return emitLogical(e, node);
		case "ConditionalExpression":
			return emitConditional(e, node);
		case "AssignmentExpression":
			return emitAssignment(e, node, true) as Kind;
		case "UpdateExpression":
			return emitUpdate(e, node, true) as Kind;
		case "SequenceExpression":
			return emitSequence(e, node);
		case "CallExpression": {
			const kind = emitCall(e, node);
			if (kind !== "void") return kind;
			e.code.f64Const(Number.NaN);
			return "f64";
		}
		default:
			return e.fail(node, `${node.type} is not supported by the WASM backend`);
	}
}

/** Emit for effects only: no value is left on the stack. */
export function emitDiscard(e: FnEmitter, node: AnyNode): void {
	if (e.fold(node) !== null) return;
	if (node.type === "AssignmentExpression") emitAssignment(e, node, false);
	else if (node.type === "UpdateExpression") emitUpdate(e, node, false);
	else if (node.type === "SequenceExpression") for (const x of node.expressions) emitDiscard(e, x);
	else if (node.type === "CallExpression") {
		if (emitCall(e, node) !== "void") e.code.op(OP.drop);
	} else {
		emitExpr(e, node);
		e.code.op(OP.drop);
	}
}

export function emitStatic(e: FnEmitter, v: StaticValue, at: AnyNode): Kind {
	if (typeof v === "boolean") {
		e.code.i32Const(v ? 1 : 0);
		return "bool";
	}
	if (typeof v === "string") return e.fail(at, `the string "${v}" cannot exist at run time`);
	e.code.f64Const(v === undefined ? Number.NaN : v === null ? 0 : v);
	return "f64";
}

/** A resolved value as a run-time value. */
export function emitValue(e: FnEmitter, value: Value | undefined | null, at: AnyNode): Kind {
	if (value === undefined || value === null) {
		const name = at.type === "Identifier" ? `'${at.name}'` : "this expression";
		return e.fail(at, `${name} is not a value the WASM backend knows`);
	}
	switch (value.k) {
		case "local":
			e.code.get(value.index);
			return value.kind;
		case "static":
			return emitStatic(e, value.value, at);
		case "memory":
			if (value.shape.k !== "number") return e.fail(at, `a ${value.shape.k} is not a number`);
			if (value.at.base === null) e.code.i32Const(0);
			else e.code.get(value.at.base);
			e.code.loadF64(value.at.offset);
			return "f64";
		case "pointer":
			return e.fail(at, `a ${value.shape.k} is not a number`);
		case "role":
			return e.fail(at, `the ${value.role} record is not a number`);
	}
}

function emitUnary(e: FnEmitter, node: UnaryExpression): Kind {
	if (node.operator === "void") {
		emitDiscard(e, node.argument);
		e.code.f64Const(Number.NaN);
		return "f64";
	}
	if (node.operator === "typeof" || node.operator === "delete")
		return e.fail(node, `\`${node.operator}\` must fold while compiling`);
	if (node.operator === "!") {
		emitTest(e, node.argument);
		e.code.op(OP.i32Eqz);
		return "bool";
	}
	const width = node.operator === "-" ? integerWidth(e, node) : null;
	if (width !== null) {
		if (width === "int") e.code.i32Const(0);
		else e.code.i64Const(0);
		emitInteger(e, node.argument, width);
		e.code.op(width === "int" ? OP.i32Sub : OP.i64Sub);
		return width;
	}
	const kind = emitExpr(e, node.argument);
	switch (node.operator) {
		case "-":
			toF64(e, kind);
			e.code.op(OP.f64Neg);
			return "f64";
		case "+":
			if (kind === "int" || kind === "long") return kind;
			toF64(e, kind);
			return "f64";
		case "~":
			toInt32(e, kind);
			e.code.i32Const(-1).op(OP.i32Xor);
			return "int";
	}
}

function emitSequence(e: FnEmitter, node: SequenceExpression): Kind {
	const all = node.expressions;
	for (let k = 0; k < all.length - 1; k++) emitDiscard(e, all[k] as Expression);
	return emitExpr(e, all[all.length - 1] as Expression);
}
