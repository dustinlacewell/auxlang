/**
 * A function's statements, walked as a backend emits them: a known `if`
 * test walks only its live branch, a list stops after a statement that
 * never falls through, a loop walks its body and update whatever its test,
 * a switch walks every case's statements. Declarations: walk-declaration.ts;
 * `for` and its counters: walk-for.ts.
 */

import type { AnyNode, IfStatement, ReturnStatement, SwitchStatement } from "acorn";
import type { PlanContext } from "./plan-context";
import { typeExpr } from "./type-expression";
import { walkDeclaration } from "./walk-declaration";
import { walkFor } from "./walk-for";

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
			walkDeclaration(c, node);
			return false;
		case "BlockStatement":
			return walkStatements(c, node.body);
		case "IfStatement":
			return walkIf(c, node);
		case "ForStatement":
			walkFor(c, node, walkStatement);
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
