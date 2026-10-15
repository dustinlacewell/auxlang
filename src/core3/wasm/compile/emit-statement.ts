/**
 * Statements. A known `if` test emits only its live branch. Blocks open a
 * scope; a declaration sees the rest of its block (emit-declaration.ts).
 */

import type {
	AnyNode,
	BreakStatement,
	ContinueStatement,
	IfStatement,
	LabeledStatement,
	ReturnStatement,
} from "acorn";
import { OP } from "../encode/opcodes";
import { toF64 } from "./coerce";
import { emitDeclaration } from "./emit-declaration";
import { emitDiscard, emitExpr } from "./emit-expression";
import { emitLoop } from "./emit-loop";
import { emitSwitch } from "./emit-switch";
import { emitTest } from "./emit-test";
import type { FnEmitter } from "./fn-emitter";
import { staticOf } from "./static-value";

/**
 * Emit a statement list up to the first statement that never falls through:
 * what follows it is dead, and may not make sense where a branch was folded
 * away (`if (typeof x === "number") return x; const n = x.length;`).
 * `after`: code that follows the list in the same scope (a switch's later
 * cases), which a declaration must see too.
 */
export function emitStatements(
	e: FnEmitter,
	list: readonly AnyNode[],
	after: readonly AnyNode[] = [],
): boolean {
	for (let k = 0; k < list.length; k++) {
		const statement = list[k] as AnyNode;
		if (statement.type === "VariableDeclaration")
			emitDeclaration(e, statement, [...list.slice(k + 1), ...after]);
		else if (emitStatement(e, statement)) return true;
	}
	return false;
}

/** Emits `node`; true when control never falls through it. */
export function emitStatement(e: FnEmitter, node: AnyNode, label: string | null = null): boolean {
	switch (node.type) {
		case "ExpressionStatement":
			if (!("directive" in node && typeof node.directive === "string"))
				emitDiscard(e, node.expression);
			return false;
		case "VariableDeclaration":
			emitDeclaration(e, node, null);
			return false;
		case "BlockStatement":
			return e.within(e.scope.child(), () => emitStatements(e, node.body));
		case "EmptyStatement":
			return false;
		case "IfStatement":
			return emitIf(e, node);
		case "ForStatement":
		case "WhileStatement":
		case "DoWhileStatement":
			emitLoop(e, node, label);
			return false;
		case "SwitchStatement":
			emitSwitch(e, node, label);
			return false;
		case "BreakStatement":
		case "ContinueStatement":
			emitJump(e, node);
			return true;
		case "ReturnStatement":
			emitReturn(e, node);
			return true;
		case "LabeledStatement":
			emitLabeled(e, node);
			return false;
		default:
			return e.fail(node, `${node.type} is not supported by the WASM backend`);
	}
}

function emitIf(e: FnEmitter, node: IfStatement): boolean {
	const known = staticOf(e, node.test);
	if (known !== null) {
		const live = known.v ? node.consequent : node.alternate;
		return live !== null && live !== undefined && emitStatement(e, live);
	}
	emitTest(e, node.test);
	e.enter(OP.if);
	const yes = emitStatement(e, node.consequent);
	let no = false;
	if (node.alternate !== null && node.alternate !== undefined) {
		e.else();
		no = emitStatement(e, node.alternate);
	}
	e.exit();
	return yes && no;
}

function emitJump(e: FnEmitter, node: BreakStatement | ContinueStatement): void {
	e.br(jumpTarget(e, node));
}

/** The depth a `break` or `continue` branches to: the innermost matching loop, switch or label. */
function jumpTarget(e: FnEmitter, node: BreakStatement | ContinueStatement): number {
	const name = node.label?.name ?? null;
	const isBreak = node.type === "BreakStatement";
	for (let k = e.labels.length - 1; k >= 0; k--) {
		const target = e.labels[k];
		if (target === undefined) continue;
		const named = name === null ? target.implicit : target.name === name;
		if (!named) continue;
		if (isBreak) return target.breakAt;
		if (target.continueAt !== null) return target.continueAt;
		if (name !== null) e.fail(node, `'${name}' is not a loop`);
	}
	return e.fail(node, `no ${isBreak ? "break" : "continue"} target`);
}

function emitReturn(e: FnEmitter, node: ReturnStatement): void {
	const ret = e.ctx.ret;
	const arg = node.argument;
	if (ret.k === "exit") {
		if (arg !== null && arg !== undefined) emitDiscard(e, arg);
		e.br(ret.depth);
		return;
	}
	let kind = "f64" as ReturnType<typeof emitExpr>;
	if (arg === null || arg === undefined) e.code.f64Const(Number.NaN);
	else kind = emitExpr(e, arg);
	ret.seen.push(kind);
	if (ret.kind === "f64") toF64(e, kind);
	else if (kind !== "bool") e.fail(node, "this helper returns booleans and numbers");
	e.code.op(OP.return);
}

function emitLabeled(e: FnEmitter, node: LabeledStatement): void {
	const body = node.body;
	const name = node.label.name;
	if (
		body.type === "ForStatement" ||
		body.type === "WhileStatement" ||
		body.type === "DoWhileStatement" ||
		body.type === "SwitchStatement"
	) {
		emitStatement(e, body, name);
		return;
	}
	const at = e.enter(OP.block);
	e.labels.push({ name, implicit: false, breakAt: at, continueAt: null });
	emitStatement(e, body);
	e.labels.pop();
	e.exit();
}
