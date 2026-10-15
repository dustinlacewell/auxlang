/**
 * Print one statement of a pasted function as lines. Bodies of `if` and
 * loops are always braced; a `return` in a tick becomes a break out of the
 * tick's labelled block (its value, if any, is still evaluated); labels are
 * renamed. `var` is refused: hoisting out of a block that runs every sample
 * would carry its value from one sample to the next.
 */

import type { AnyNode, Statement, SwitchCase, VariableDeclaration } from "acorn";
import { refuse } from "./not-pasteable";
import type { PasteContext } from "./paste-context";
import { printExpression } from "./print-expression";

export function printStatements(nodes: readonly AnyNode[], ctx: PasteContext): string[] {
	return nodes.flatMap((node) => printStatement(node, ctx));
}

export function printStatement(node: AnyNode, ctx: PasteContext): string[] {
	switch (node.type) {
		case "BlockStatement":
			return ["{", ...printStatements(node.body, ctx), "}"];
		case "ExpressionStatement":
			return node.directive !== undefined ? [] : [`${printExpression(node.expression, ctx)};`];
		case "EmptyStatement":
			return [];
		case "VariableDeclaration":
			return [`${printDeclaration(node, ctx)};`];
		case "IfStatement":
			return [
				`if (${printExpression(node.test, ctx)}) {`,
				...printStatement(node.consequent, ctx),
				...(node.alternate ? ["} else {", ...printStatement(node.alternate, ctx)] : []),
				"}",
			];
		case "SwitchStatement":
			return [
				`switch (${printExpression(node.discriminant, ctx)}) {`,
				...node.cases.flatMap((c) => printCase(c, ctx)),
				"}",
			];
		case "ForStatement":
			return [
				`for (${forInit(node.init, ctx)}; ${optional(node.test, ctx)}; ${optional(node.update, ctx)}) {`,
				...printStatement(node.body, ctx),
				"}",
			];
		case "WhileStatement":
			return [
				`while (${printExpression(node.test, ctx)}) {`,
				...printStatement(node.body, ctx),
				"}",
			];
		case "DoWhileStatement":
			return [
				"do {",
				...printStatement(node.body, ctx),
				`} while (${printExpression(node.test, ctx)});`,
			];
		case "BreakStatement":
			return [`break${jumpLabel(node.label?.name, ctx)};`];
		case "ContinueStatement":
			return [`continue${jumpLabel(node.label?.name, ctx)};`];
		case "ReturnStatement":
			return printReturn(node.argument ?? null, ctx);
		case "LabeledStatement":
			return printLabeled(node.label.name, node.body, ctx);
	}
	return refuse(`${node.type} is not pasteable`);
}

function printDeclaration(node: VariableDeclaration, ctx: PasteContext): string {
	if (node.kind !== "let" && node.kind !== "const") refuse(`'${node.kind}' is not pasteable`);
	const parts = node.declarations.map((d) => {
		if (d.id.type !== "Identifier") refuse("destructuring is not pasteable");
		const name = ctx.locals.get(d.id.type === "Identifier" ? d.id.name : "");
		if (name === undefined) refuse("undeclared local");
		return d.init ? `${name} = ${printExpression(d.init, ctx)}` : `${name}`;
	});
	return `${node.kind} ${parts.join(", ")}`;
}

function printCase(c: SwitchCase, ctx: PasteContext): string[] {
	const head = c.test ? `case ${printExpression(c.test, ctx)}:` : "default:";
	return [head, ...printStatements(c.consequent, ctx)];
}

function forInit(
	init: VariableDeclaration | AnyNode | null | undefined,
	ctx: PasteContext,
): string {
	if (init === null || init === undefined) return "";
	if (init.type === "VariableDeclaration") return printDeclaration(init, ctx);
	return printExpression(init, ctx);
}

function optional(node: AnyNode | null | undefined, ctx: PasteContext): string {
	return node === null || node === undefined ? "" : printExpression(node, ctx);
}

function jumpLabel(label: string | undefined, ctx: PasteContext): string {
	if (label === undefined) return "";
	const renamed = ctx.labels.get(label);
	return renamed === undefined ? refuse(`unknown label '${label}'`) : ` ${renamed}`;
}

function printReturn(argument: AnyNode | null, ctx: PasteContext): string[] {
	const value = argument === null ? null : printExpression(argument, ctx);
	if (ctx.exit === null) return [value === null ? "return;" : `return ${value};`];
	return ["{", ...(value === null ? [] : [`${value};`]), `break ${ctx.exit};`, "}"];
}

/** The label goes directly on the statement, so `continue label` still names a loop. */
function printLabeled(label: string, body: Statement, ctx: PasteContext): string[] {
	if (ctx.labels.has(label)) refuse(`label '${label}' is reused`);
	const renamed = ctx.names.fresh();
	ctx.labels.set(label, renamed);
	const lines = printStatement(body, ctx);
	ctx.labels.delete(label);
	return [`${renamed}:`, ...(lines.length === 0 ? [";"] : lines)];
}
