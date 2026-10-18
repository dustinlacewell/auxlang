/**
 * Parse one function's source text (as `Function.prototype.toString` gives
 * it) into an ESTree function node. Arrows, function expressions and
 * declarations parse as an expression; an object-method shorthand
 * (`tick(s, i, o) { ... }`) is re-wrapped as an object and its value taken.
 * Positions stay on the source's own lines: the wrapper adds no newline.
 */

import { type AnyNode, type ArrowFunctionExpression, type FunctionExpression, parse } from "acorn";

export type FunctionNode = ArrowFunctionExpression | FunctionExpression;

export interface ParsedFunction {
	readonly node: FunctionNode;
	/** Text that evaluates to the function: `(src)` or `({ src })["key"]`. */
	readonly expression: string;
	/** Characters the wrapper adds before `src`; node offsets minus this are source offsets. */
	readonly offset: number;
}

export function parseFunction(src: string, what: string): ParsedFunction {
	return asExpression(src) ?? asMethod(src) ?? fail(src, what);
}

function asExpression(src: string): ParsedFunction | null {
	const expression = `(${src})`;
	const body = tryParse(expression);
	if (body === null || body.type !== "ExpressionStatement") return null;
	const node = body.expression;
	if (node.type !== "ArrowFunctionExpression" && node.type !== "FunctionExpression") return null;
	return { node, expression, offset: 1 };
}

function asMethod(src: string): ParsedFunction | null {
	const wrapped = `({${src}})`;
	const body = tryParse(wrapped);
	if (body === null || body.type !== "ExpressionStatement") return null;
	const object = body.expression;
	if (object.type !== "ObjectExpression" || object.properties.length !== 1) return null;
	const prop = object.properties[0];
	if (prop === undefined || prop.type !== "Property" || prop.value.type !== "FunctionExpression")
		return null;
	if (prop.key.type !== "Identifier") return null;
	return {
		node: prop.value,
		expression: `${wrapped}[${JSON.stringify(prop.key.name)}]`,
		offset: 2,
	};
}

function tryParse(text: string): AnyNode | null {
	try {
		const program = parse(text, { ecmaVersion: "latest", locations: true });
		return program.body.length === 1 ? (program.body[0] as AnyNode) : null;
	} catch {
		return null;
	}
}

function fail(src: string, what: string): never {
	throw new Error(`${what}: source is not a function: ${src}`);
}
