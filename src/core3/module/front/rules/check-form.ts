/**
 * The syntax whitelist. Every node type a tick may contain is listed here;
 * anything else is a violation, with a specific reason for the forms people
 * reach for (literals that allocate, closures, runtime strings, iteration
 * protocols).
 */

import type { AnyNode } from "acorn";
import type { RuleContext } from "./rule-context";

const ALLOWED = new Set([
	"BlockStatement",
	"ExpressionStatement",
	"EmptyStatement",
	"VariableDeclaration",
	"VariableDeclarator",
	"IfStatement",
	"SwitchStatement",
	"SwitchCase",
	"ForStatement",
	"WhileStatement",
	"DoWhileStatement",
	"BreakStatement",
	"ContinueStatement",
	"ReturnStatement",
	"LabeledStatement",
	"Identifier",
	"Literal",
	"MemberExpression",
	"CallExpression",
	"AssignmentExpression",
	"UpdateExpression",
	"BinaryExpression",
	"LogicalExpression",
	"UnaryExpression",
	"ConditionalExpression",
	"SequenceExpression",
]);

const REASONS: Record<string, string> = {
	ObjectExpression: "object literals allocate — build fixed-shape objects in state()",
	ArrayExpression: "array literals allocate — build arrays in state()",
	NewExpression: "`new` allocates — build objects and typed arrays in state()",
	ArrowFunctionExpression: "nested functions are closures — declare them in `helpers`",
	FunctionExpression: "nested functions are closures — declare them in `helpers`",
	FunctionDeclaration: "nested functions are closures — declare them in `helpers`",
	TemplateLiteral: "template strings build strings at runtime",
	TaggedTemplateExpression: "template strings build strings at runtime",
	ForOfStatement: "for...of uses the iterator protocol — use an index loop",
	ForInStatement: "for...in walks field names as strings — use fixed field names",
	SpreadElement: "spread allocates",
	RestElement: "rest parameters allocate",
	ObjectPattern: "destructuring is not allowed — read fields one by one",
	ArrayPattern: "destructuring is not allowed — read elements one by one",
	AssignmentPattern: "default values are not allowed",
	ThisExpression: "`this` is not available",
	ChainExpression: "optional chaining is not allowed — state shapes are fixed",
	ClassExpression: "classes are not allowed",
	ClassDeclaration: "classes are not allowed",
	AwaitExpression: "`await` is not allowed",
	YieldExpression: "`yield` is not allowed",
	ImportExpression: "`import()` is not allowed",
	MetaProperty: "`new.target`/`import.meta` are not allowed",
	TryStatement: "try/catch is not allowed — a tick must not throw",
	ThrowStatement: "`throw` is not allowed — a tick must not throw",
	WithStatement: "`with` is not allowed",
	DebuggerStatement: "`debugger` is not allowed",
};

export function checkForm(node: AnyNode, ctx: RuleContext): void {
	if (ALLOWED.has(node.type)) {
		if (node.type === "Literal" && "regex" in node && node.regex !== undefined)
			ctx.fail(node, "regular expressions are not allowed");
		if (node.type === "Literal" && typeof node.value === "bigint")
			ctx.fail(node, "BigInt values are not allowed");
		return;
	}
	ctx.fail(node, REASONS[node.type] ?? `${node.type} is not allowed`);
}
