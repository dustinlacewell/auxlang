/**
 * Constant folding: the value of an expression when it is known while
 * compiling (literals, config, constant inputs, `const` names bound to
 * constants, array lengths, `typeof`). Folding runs the same IEEE operations
 * the JS backend runs at sample time, so a folded value has the same bits.
 * Expressions with effects (calls other than exact Math, assignments) never
 * fold. `**` never folds: it is auxlang's pow, not the host's.
 */

import type { AnyNode, BinaryExpression, CallExpression, LogicalExpression } from "acorn";
import { EXACT_HOST_MATH } from "../../math/exact-host-math";
import type { FnEmitter } from "./fn-emitter";
import { validIndex } from "./index-access";
import { resolve } from "./resolve";
import type { StaticValue } from "./values";

export interface Folded {
	readonly v: StaticValue;
}

const GLOBALS: Readonly<Record<string, StaticValue>> = {
	undefined: undefined,
	NaN: Number.NaN,
	Infinity: Number.POSITIVE_INFINITY,
};

export function staticOf(e: FnEmitter, node: AnyNode): Folded | null {
	switch (node.type) {
		case "Literal":
			if (node.value instanceof RegExp || typeof node.value === "bigint") return null;
			return { v: node.value as StaticValue };
		case "Identifier": {
			const value = e.scope.lookup(node.name);
			if (value === undefined) return node.name in GLOBALS ? { v: GLOBALS[node.name] } : null;
			return value.k === "static" ? { v: value.value } : null;
		}
		case "MemberExpression": {
			if (node.computed) return staticIndex(e, node.object, node.property);
			const value = resolve(e, node);
			return value?.k === "static" ? { v: value.value } : null;
		}
		case "UnaryExpression":
			return unary(e, node.operator, node.argument);
		case "BinaryExpression":
			return binary(e, node);
		case "LogicalExpression":
			return logical(e, node);
		case "ConditionalExpression": {
			const test = staticOf(e, node.test);
			if (test === null) return null;
			return staticOf(e, test.v ? node.consequent : node.alternate);
		}
		case "CallExpression":
			return exactMath(e, node);
		default:
			return null;
	}
}

/** `typeof` of an expression when its type is known: a run-time value has the type of its kind. */
export function typeofOf(e: FnEmitter, node: AnyNode): string | null {
	const folded = staticOf(e, node);
	if (folded !== null) return typeof folded.v;
	const value = resolve(e, node);
	if (value === null) return null;
	if (value.k === "memory") return value.shape.k === "number" ? "number" : "object";
	if (value.k === "local") return value.kind === "bool" ? "boolean" : "number";
	return null;
}

/** An array read at a constant index that is not valid (index-access.ts) is `undefined`. */
function staticIndex(e: FnEmitter, object: AnyNode, property: AnyNode): Folded | null {
	const owner = resolve(e, object);
	if (owner?.k !== "memory" || owner.shape.k === "number" || owner.shape.k === "record")
		return null;
	const index = staticOf(e, property);
	if (index === null || typeof index.v !== "number") return null;
	return validIndex(index.v, owner.shape.length) ? null : { v: undefined };
}

function unary(e: FnEmitter, operator: string, argument: AnyNode): Folded | null {
	if (operator === "typeof") {
		const type = typeofOf(e, argument);
		return type === null ? null : { v: type };
	}
	const arg = staticOf(e, argument);
	if (arg === null) return null;
	const v = arg.v as number;
	switch (operator) {
		case "!":
			return { v: !v };
		case "-":
			return { v: -v };
		case "+":
			return { v: +v };
		case "~":
			return { v: ~v };
		case "void":
			return { v: undefined };
		default:
			return null;
	}
}

function binary(e: FnEmitter, node: BinaryExpression): Folded | null {
	if (node.operator === "**" || node.left.type === "PrivateIdentifier") return null;
	const left = staticOf(e, node.left);
	if (left === null) return null;
	const right = staticOf(e, node.right);
	if (right === null) return null;
	return { v: applyBinary(node.operator, left.v, right.v) };
}

/* biome-ignore lint/suspicious/noExplicitAny: JS operator semantics on any static value. */
function applyBinary(op: string, a: any, b: any): StaticValue {
	switch (op) {
		case "+":
			return a + b;
		case "-":
			return a - b;
		case "*":
			return a * b;
		case "/":
			return a / b;
		case "%":
			return a % b;
		case "<":
			return a < b;
		case ">":
			return a > b;
		case "<=":
			return a <= b;
		case ">=":
			return a >= b;
		case "===":
			return a === b;
		case "!==":
			return a !== b;
		case "==":
			// biome-ignore lint/suspicious/noDoubleEquals: folding the operator as written.
			return a == b;
		case "!=":
			// biome-ignore lint/suspicious/noDoubleEquals: folding the operator as written.
			return a != b;
		case "&":
			return a & b;
		case "|":
			return a | b;
		case "^":
			return a ^ b;
		case "<<":
			return a << b;
		case ">>":
			return a >> b;
		case ">>>":
			return a >>> b;
		default:
			return undefined;
	}
}

function logical(e: FnEmitter, node: LogicalExpression): Folded | null {
	const left = staticOf(e, node.left);
	if (left === null) return null;
	const v = left.v;
	if (node.operator === "&&") return v ? staticOf(e, node.right) : left;
	if (node.operator === "||") return v ? left : staticOf(e, node.right);
	return v === undefined || v === null ? staticOf(e, node.right) : left;
}

/** An exact host Math call on constants: the same bits on every engine (math/exact-host-math.ts). */
function exactMath(e: FnEmitter, node: CallExpression): Folded | null {
	const callee = node.callee;
	if (
		callee.type !== "MemberExpression" ||
		callee.computed ||
		callee.object.type !== "Identifier" ||
		callee.object.name !== "Math" ||
		e.scope.lookup("Math") !== undefined ||
		callee.property.type !== "Identifier" ||
		!EXACT_HOST_MATH.has(callee.property.name)
	)
		return null;
	const args: StaticValue[] = [];
	for (const arg of node.arguments) {
		const folded = staticOf(e, arg);
		if (folded === null) return null;
		args.push(folded.v);
	}
	const fn = Math[callee.property.name as keyof Math] as (...a: StaticValue[]) => number;
	return { v: fn(...args) };
}
