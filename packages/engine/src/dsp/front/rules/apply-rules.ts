/**
 * Run every rule over one function: its parameters, then each node of its
 * body, parent first, through the rule for that node's form.
 */

import type { AnyNode } from "acorn";
import type { FunctionNode } from "../parse/parse-function";
import { walk } from "../parse/walk";
import { checkCall } from "./check-call";
import { checkForm } from "./check-form";
import { checkMember } from "./check-member";
import { checkName } from "./check-name";
import { checkNullish } from "./check-nullish";
import { checkParams } from "./check-params";
import { checkBinary, checkStringLiteral, checkUnary } from "./check-string";
import { checkWrite } from "./check-write";
import type { RuleContext } from "./rule-context";

export function applyRules(fn: FunctionNode, ctx: RuleContext): void {
	checkParams(fn, ctx);
	walk(fn.body, (node, parent, key) => visit(node, parent, key, ctx));
}

function visit(node: AnyNode, parent: AnyNode | null, key: string | null, ctx: RuleContext): void {
	checkForm(node, ctx);
	if (node.type === "VariableDeclarator" && (node.init === null || node.init === undefined))
		ctx.fail(
			node,
			"every variable needs an initial value (`let x = 0`) — an unset one is `undefined`, which a WASM local cannot hold",
		);
	if (node.type === "Identifier") checkName(node, parent, key, ctx);
	else if (node.type === "Literal") checkStringLiteral(node, parent, key, ctx);
	else if (node.type === "CallExpression") checkCall(node, ctx);
	else if (node.type === "MemberExpression") checkMember(node, parent, key, ctx);
	else if (node.type === "UnaryExpression") checkUnary(node, parent, ctx);
	else if (node.type === "BinaryExpression") checkBinary(node, ctx);
	else if (node.type === "LogicalExpression") {
		if (node.operator === "??") checkNullish(node.left, ctx);
	} else if (node.type === "AssignmentExpression") {
		if (node.operator === "**=")
			ctx.fail(node, "`**=` is not allowed — write `x = x ** y` (`**` is auxlang's pow)");
		if (node.operator === "??=") checkNullish(node.left, ctx);
		checkWrite(node.left, ctx);
	} else if (node.type === "UpdateExpression") checkWrite(node.argument, ctx);
}
