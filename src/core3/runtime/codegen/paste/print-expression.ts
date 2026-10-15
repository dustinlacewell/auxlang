/**
 * Print one expression of a pasted function. Every compound expression is
 * fully parenthesised, so precedence never depends on the source's spelling;
 * names resolve through the paste context (print-name.ts); literals are
 * re-spelled (numbers exactly, strings as JSON). Anything else is refused.
 */

import type { AnyNode, Expression, PrivateIdentifier } from "acorn";
import { numLiteral } from "../js-literal";
import { refuse } from "./not-pasteable";
import type { PasteContext } from "./paste-context";
import { printCall } from "./print-call";
import { printMember } from "./print-member";
import { printName } from "./print-name";

export function printExpression(node: AnyNode, ctx: PasteContext): string {
	switch (node.type) {
		case "Identifier":
			return printName(node.name, ctx);
		case "Literal":
			return printLiteral(node.value, node);
		case "MemberExpression":
			return printMember(node, ctx, false);
		case "CallExpression":
			return printCall(node, ctx);
		case "AssignmentExpression":
			return `(${printTarget(node.left, ctx)} ${node.operator} ${printExpression(node.right, ctx)})`;
		case "UpdateExpression": {
			const target = printTarget(node.argument, ctx);
			return node.prefix ? `(${node.operator}${target})` : `(${target}${node.operator})`;
		}
		case "BinaryExpression":
			if (node.operator === "in" || node.operator === "instanceof")
				refuse(`'${node.operator}' is not pasteable`);
			return `(${operand(node.left, ctx)} ${node.operator} ${printExpression(node.right, ctx)})`;
		case "LogicalExpression":
			return `(${printExpression(node.left, ctx)} ${node.operator} ${printExpression(node.right, ctx)})`;
		case "UnaryExpression":
			if (node.operator === "delete") refuse("'delete' is not pasteable");
			return `(${node.operator} ${printExpression(node.argument, ctx)})`;
		case "ConditionalExpression":
			return `(${printExpression(node.test, ctx)} ? ${printExpression(node.consequent, ctx)} : ${printExpression(node.alternate, ctx)})`;
		case "SequenceExpression":
			return `(${node.expressions.map((e) => printExpression(e, ctx)).join(", ")})`;
	}
	return refuse(`${node.type} is not pasteable`);
}

/** An assignment or update target: a local, or a field (marked as written). */
export function printTarget(node: AnyNode, ctx: PasteContext): string {
	if (node.type === "Identifier") {
		const local = ctx.locals.get(node.name);
		return local ?? refuse(`assignment to '${node.name}' is not pasteable`);
	}
	if (node.type === "MemberExpression") return printMember(node, ctx, true);
	return refuse(`${node.type} is not an assignable target`);
}

function operand(node: Expression | PrivateIdentifier, ctx: PasteContext): string {
	if (node.type === "PrivateIdentifier") refuse("private names are not pasteable");
	return printExpression(node, ctx);
}

function printLiteral(value: unknown, node: AnyNode): string {
	if (typeof value === "number") return numLiteral(value);
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	if (value === null && !("regex" in node && node.regex !== undefined)) return "null";
	return refuse("only number, string, boolean and null literals are pasteable");
}
