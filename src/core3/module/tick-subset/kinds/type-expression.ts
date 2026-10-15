/**
 * An expression's type, checking its parts on the way (check-kinds.ts):
 * comparisons and `!` give booleans, arithmetic and auxlang's calls give
 * numbers, a field gives its fresh value's type, a helper call what the
 * helper returns for these arguments. A store of a boolean where a number is
 * kept (or the reverse), and a kept value that is a boolean on one path and
 * a number on another, are loud errors.
 */

import type { AnyNode, AssignmentExpression, Expression, MemberExpression } from "acorn";
import { TABLE_INTRINSICS } from "../table-intrinsics";
import type { KindContext, Position } from "./kind-context";
import { INTO_BOOLEAN, MIXED, STEP_BOOLEAN, STORED } from "./kind-messages";
import {
	BOOL,
	NUM,
	OTHER,
	UNKNOWN,
	type ValueType,
	conflict,
	join,
	typeOfValue,
} from "./value-type";

const COMPARISONS = new Set(["<", ">", "<=", ">=", "===", "==", "!==", "!="]);

export function typeOf(c: KindContext, node: AnyNode, pos: Position): ValueType {
	switch (node.type) {
		case "Literal":
			return typeof node.value === "number" ? NUM : typeof node.value === "boolean" ? BOOL : OTHER;
		case "Identifier":
			return nameType(c, node.name);
		case "MemberExpression":
			return memberType(c, node);
		case "CallExpression":
			return callType(c, node.callee, node.arguments as Expression[]);
		case "AssignmentExpression":
			return assignmentType(c, node);
		case "UpdateExpression":
			if (placeType(c, node.argument).k === "bool") c.fail(node, STEP_BOOLEAN);
			return NUM;
		case "BinaryExpression":
			typeOf(c, node.left, "value");
			typeOf(c, node.right, "value");
			return COMPARISONS.has(node.operator) ? BOOL : NUM;
		case "LogicalExpression":
			return paths(c, node, typeOf(c, node.left, pos), typeOf(c, node.right, pos), pos);
		case "ConditionalExpression":
			typeOf(c, node.test, "loose");
			return paths(c, node, typeOf(c, node.consequent, pos), typeOf(c, node.alternate, pos), pos);
		case "UnaryExpression":
			return unaryType(c, node.operator, node.argument);
		case "SequenceExpression":
			node.expressions.forEach((x, k) =>
				typeOf(c, x, k === node.expressions.length - 1 ? pos : "loose"),
			);
			return typeOf(c, node.expressions[node.expressions.length - 1] as Expression, pos);
		default:
			return UNKNOWN;
	}
}

/** A value kept from one of two paths. */
function paths(c: KindContext, at: AnyNode, a: ValueType, b: ValueType, pos: Position): ValueType {
	if (pos === "value" && conflict(a, b)) c.fail(at, MIXED);
	return join(a, b);
}

function nameType(c: KindContext, name: string): ValueType {
	const known = c.lookup(name);
	if (known !== undefined) return known;
	if (name === "NaN" || name === "Infinity") return NUM;
	if (name === "undefined") return OTHER;
	return UNKNOWN;
}

function unaryType(c: KindContext, op: string, argument: AnyNode): ValueType {
	if (op === "!") {
		typeOf(c, argument, "loose");
		return BOOL;
	}
	if (op === "typeof" || op === "void" || op === "delete") return OTHER;
	typeOf(c, argument, "value");
	return NUM;
}

function memberType(c: KindContext, node: MemberExpression): ValueType {
	if (isMath(c, node.object)) return NUM;
	const owner = typeOf(c, node.object as AnyNode, "value");
	if (node.computed) {
		typeOf(c, node.property, "value");
		if (owner.k === "data" && Array.isArray(owner.v)) return typeOfValue(owner.v[0]);
		return NUM;
	}
	const field = node.property.type === "Identifier" ? node.property.name : "";
	if (owner.k === "ins" || owner.k === "outs") return NUM;
	if (owner.k !== "data") return UNKNOWN;
	if (field === "length") return NUM;
	return typeOfValue((owner.v as Record<string, unknown>)[field]);
}

function callType(c: KindContext, callee: AnyNode, args: readonly Expression[]): ValueType {
	const types = args.map((a) => typeOf(c, a, "value"));
	if (callee.type === "Identifier" && c.lookup(callee.name) === undefined) {
		const helper = c.callHelper(callee.name, types);
		if (helper !== null) return helper;
		if (callee.name === "hashRandom" || TABLE_INTRINSICS.has(callee.name)) return NUM;
	}
	if (callee.type === "MemberExpression" && isMath(c, callee.object)) return NUM;
	return UNKNOWN;
}

function assignmentType(c: KindContext, node: AssignmentExpression): ValueType {
	const place = placeType(c, node.left);
	const value = typeOf(c, node.right, "value");
	if (node.operator !== "=") {
		if (place.k === "bool") c.fail(node, INTO_BOOLEAN);
		return NUM;
	}
	if (place.k === "num" && value.k === "bool") c.fail(node, STORED);
	if (place.k === "bool" && value.k === "num") c.fail(node, INTO_BOOLEAN);
	return value;
}

/**
 * The type a write target keeps: a local's, an output's (a number), a state
 * field's. An array element converts what it is given in JS too, so it
 * keeps anything.
 */
function placeType(c: KindContext, target: AnyNode): ValueType {
	if (target.type === "Identifier") return nameType(c, target.name);
	if (target.type !== "MemberExpression") return UNKNOWN;
	if (target.computed) {
		typeOf(c, target.object as AnyNode, "value");
		typeOf(c, target.property, "value");
		return UNKNOWN;
	}
	return memberType(c, target);
}

function isMath(c: KindContext, node: AnyNode): boolean {
	return node.type === "Identifier" && node.name === "Math" && c.lookup("Math") === undefined;
}
