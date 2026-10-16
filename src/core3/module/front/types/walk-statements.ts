/**
 * A function's statements, walked as a backend emits them: a known `if`
 * test walks only its live branch, a list stops after a statement that
 * never falls through, a loop walks its body and update whatever its test,
 * a switch walks every case's statements. A `const` of a known value, an
 * array or a record names it directly; any other variable holds a run-time
 * value of its initial value's type.
 */

import type { AnyNode, IfStatement, ReturnStatement, SwitchStatement, VariableDeclaration } from "acorn";
import type { PlanContext } from "./plan-context";
import { NUM, type Ty, emittedTy, ref } from "./ty";
import { typeExpr } from "./type-expression";

/** Walks `list`; true when control never falls through it. */
export function walkStatements(c: PlanContext, list: readonly AnyNode[]): boolean {
	for (const statement of list) if (walkStatement(c, statement)) return true;
	return false;
}

function walkStatement(c: PlanContext, node: AnyNode): boolean {
	switch (node.type) {
		case "ExpressionStatement":
			typeExpr(c, node.expression, "loose");
			return false;
		case "VariableDeclaration":
			declare(c, node);
			return false;
		case "BlockStatement":
			return walkStatements(c, node.body);
		case "IfStatement":
			return walkIf(c, node);
		case "ForStatement":
			if (node.init?.type === "VariableDeclaration") declare(c, node.init);
			else if (node.init) typeExpr(c, node.init, "loose");
			if (node.test) typeExpr(c, node.test, "loose");
			walkStatement(c, node.body);
			if (node.update) typeExpr(c, node.update, "loose");
			return false;
		case "WhileStatement":
			typeExpr(c, node.test, "loose");
			walkStatement(c, node.body);
			return false;
		case "DoWhileStatement":
			walkStatement(c, node.body);
			typeExpr(c, node.test, "loose");
			return false;
		case "SwitchStatement":
			walkSwitch(c, node);
			return false;
		case "BreakStatement":
		case "ContinueStatement":
			return true;
		case "ReturnStatement":
			walkReturn(c, node);
			return true;
		case "LabeledStatement":
			walkStatement(c, node.body);
			return false;
		default:
			return false;
	}
}

function walkIf(c: PlanContext, node: IfStatement): boolean {
	const test = typeExpr(c, node.test, "loose");
	if (test.k === "static") {
		const live = test.v ? node.consequent : node.alternate;
		return live !== null && live !== undefined && walkStatement(c, live);
	}
	const yes = walkStatement(c, node.consequent);
	const no = node.alternate !== null && node.alternate !== undefined && walkStatement(c, node.alternate);
	return yes && no;
}

function walkSwitch(c: PlanContext, node: SwitchStatement): void {
	typeExpr(c, node.discriminant, "value");
	for (const k of node.cases) if (k.test) typeExpr(c, k.test, "value");
	for (const k of node.cases) walkStatements(c, k.consequent);
}

function walkReturn(c: PlanContext, node: ReturnStatement): void {
	const arg = node.argument;
	const ty = arg === null || arg === undefined ? null : typeExpr(c, arg, "value");
	c.returns.push({ at: node, ty });
}

function declare(c: PlanContext, node: VariableDeclaration): void {
	for (const d of node.declarations) {
		const ty = d.init === null || d.init === undefined ? NUM : typeExpr(c, d.init, "value");
		if (d.id.type === "Identifier") c.declare(d.id, declaredTy(ty, node.kind === "const"));
	}
}

function declaredTy(init: Ty, constant: boolean): Ty {
	if (constant && init.k === "static") return init;
	if (constant && init.k === "ref") return ref(init.shape);
	return emittedTy(init);
}
