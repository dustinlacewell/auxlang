/**
 * An expression's type in one plan, recorded for each node walked. The
 * walk visits what a backend emits: a known `?:` test or `&&`/`||`/`??`
 * left side leaves the dead branch unwalked. A value that is known while
 * compiling is `static` and folds, with the same IEEE operations the JS
 * backend runs at sample time. A `,` expression and an assignment never
 * fold; `**` never folds (it is auxlang's pow, not the host's).
 */

import type {
	AnyNode,
	AssignmentExpression,
	BinaryExpression,
	ConditionalExpression,
	Identifier,
	LogicalExpression,
	SequenceExpression,
	UpdateExpression,
} from "acorn";
import { applyBinary } from "./fold-ops";
import { rangeOf, union } from "./int-range";
import { keepsLeft } from "./keeps-left";
import type { PlanContext, Position } from "./plan-context";
import { binaryRange } from "./range-binary";
import { BOOL, NUM, type Ty, UNKNOWN, emittedClass, emittedTy, int, known, ref } from "./ty";
import { typeCall } from "./type-call";
import { typeMember } from "./type-member";
import { typeUnary } from "./type-unary";

const COMPARISONS = new Set(["<", ">", "<=", ">=", "===", "==", "!==", "!="]);

const LOGICAL_ASSIGNMENTS = new Set(["&&=", "||=", "??="]);

const GLOBALS: Readonly<Record<string, Ty>> = {
	undefined: known(undefined),
	NaN: known(Number.NaN),
	Infinity: known(Number.POSITIVE_INFINITY),
};

export function typeExpr(c: PlanContext, node: AnyNode, pos: Position): Ty {
	const ty = typeNode(c, node, pos);
	c.types.set(node, ty);
	return ty;
}

function typeNode(c: PlanContext, node: AnyNode, pos: Position): Ty {
	switch (node.type) {
		case "Literal":
			return node.value instanceof RegExp || typeof node.value === "bigint"
				? UNKNOWN
				: known(node.value);
		case "Identifier":
			return typeName(c, node);
		case "MemberExpression":
			return typeMember(c, node);
		case "UnaryExpression":
			return typeUnary(c, node);
		case "BinaryExpression":
			return typeBinary(c, node);
		case "LogicalExpression":
			return typeLogical(c, node, pos);
		case "ConditionalExpression":
			return typeConditional(c, node, pos);
		case "CallExpression":
			return typeCall(c, node);
		case "AssignmentExpression":
			return typeAssignment(c, node, pos);
		case "UpdateExpression":
			return typeUpdate(c, node);
		case "SequenceExpression":
			return typeSequence(c, node, pos);
		default:
			return UNKNOWN;
	}
}

function typeName(c: PlanContext, id: Identifier): Ty {
	const ty = c.varTy(id);
	if (ty !== undefined) {
		c.paths.add(id);
		return ty;
	}
	const r = c.ir.scopes.references.get(id);
	return r?.k === "global" ? (GLOBALS[r.name] ?? UNKNOWN) : UNKNOWN;
}

function typeBinary(c: PlanContext, node: BinaryExpression): Ty {
	const left = typeExpr(c, node.left, "value");
	const right = typeExpr(c, node.right, "value");
	if (node.operator !== "**" && left.k === "static" && right.k === "static")
		return known(applyBinary(node.operator, left.v, right.v));
	if (COMPARISONS.has(node.operator)) return BOOL;
	return int(binaryRange(node.operator, rangeOf(left), rangeOf(right), shiftOf(right)));
}

/** A known shift count: JS uses its low five bits. */
function shiftOf(ty: Ty): number | null {
	return ty.k === "static" && typeof ty.v === "number" ? (ty.v | 0) & 31 : null;
}

/** A known left side picks the branch; otherwise two booleans give a boolean, anything else a number. */
function typeLogical(c: PlanContext, node: LogicalExpression, pos: Position): Ty {
	const left = typeExpr(c, node.left, pos);
	if (left.k === "static") return keepsLeft(node.operator, left.v) ? left : typeExpr(c, node.right, pos);
	const right = typeExpr(c, node.right, pos);
	if (pos === "value") c.events.push({ k: "paths", node, a: left, b: right });
	// Only an array element at an invalid index is nullish at run time: `??` gives a number.
	// An integer element's range proves its index valid, so the left side is the result.
	if (node.operator === "??") return rangeOf(left) === null ? NUM : left;
	return joined(left, right);
}

function typeConditional(c: PlanContext, node: ConditionalExpression, pos: Position): Ty {
	const test = typeExpr(c, node.test, "loose");
	if (test.k === "static") return typeExpr(c, test.v ? node.consequent : node.alternate, pos);
	const a = typeExpr(c, node.consequent, pos);
	const b = typeExpr(c, node.alternate, pos);
	if (pos === "value") c.events.push({ k: "paths", node, a, b });
	return joined(a, b);
}

/**
 * One value type leaves a branch: booleans from both sides stay boolean,
 * else a number, an integer when both sides are.
 */
function joined(a: Ty, b: Ty): Ty {
	if (emittedClass(a) === "bool" && emittedClass(b) === "bool") return BOOL;
	return int(union(rangeOf(a), rangeOf(b)));
}

function typeAssignment(c: PlanContext, node: AssignmentExpression, pos: Position): Ty {
	const place = typePlace(c, node.left);
	if (LOGICAL_ASSIGNMENTS.has(node.operator)) return typeLogicalAssignment(c, node, place, pos);
	const value = typeExpr(c, node.right, "value");
	if (node.operator !== "=") {
		c.events.push({ k: "compound", node, place });
		return NUM;
	}
	c.events.push({ k: "store", node, place, value });
	return value.k === "ref" ? ref(value.shape) : emittedTy(value);
}

/**
 * `a &&= b`, `a ||= b`, `a ??= b`: `a = b` when the test on `a` passes, else
 * `a` stays. A known `a` picks the branch, as for `&&`/`||`/`??`. The result
 * is one of the two, so it mixes them like the logical operator.
 */
function typeLogicalAssignment(c: PlanContext, node: AssignmentExpression, place: Ty, pos: Position): Ty {
	const current = c.types.get(node.left) ?? UNKNOWN;
	if (current.k === "static" && keepsLeft(node.operator.slice(0, -1), current.v)) return current;
	const value = typeExpr(c, node.right, "value");
	c.events.push({ k: "store", node, place, value });
	if (current.k === "static") return emittedTy(value);
	if (pos === "value") c.events.push({ k: "paths", node, a: current, b: value });
	return emittedClass(current) === "bool" && emittedClass(value) === "bool" ? BOOL : NUM;
}

function typeUpdate(c: PlanContext, node: UpdateExpression): Ty {
	c.events.push({ k: "step", node, place: typePlace(c, node.argument) });
	return NUM;
}

/**
 * The type a write target keeps: a variable's, a field's. An array element
 * converts what it is given in JS too, so it keeps anything.
 */
function typePlace(c: PlanContext, target: AnyNode): Ty {
	const ty = typeExpr(c, target, "value");
	return target.type === "MemberExpression" && target.computed ? UNKNOWN : ty;
}

function typeSequence(c: PlanContext, node: SequenceExpression, pos: Position): Ty {
	const all = node.expressions;
	let last: Ty = UNKNOWN;
	all.forEach((x, k) => {
		last = typeExpr(c, x, k === all.length - 1 ? pos : "loose");
	});
	return emittedTy(last);
}
