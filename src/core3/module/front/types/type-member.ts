/**
 * Field and index reads. A tick's parameter record gives each field the
 * type its root holds; state in memory gives each field the type of its
 * shape. Only a member reached by a path (plan-context.ts) folds: a typed
 * array's or list's length, an array element at a constant index that is
 * not valid (`undefined`). A list element at a run-time index is placed:
 * nothing under it folds. An integer array's element read by a path at an
 * index proven in bounds has the element type's range.
 */

import type { AnyNode, MemberExpression } from "acorn";
import { MATH_CONSTANTS } from "@/core3/math/math-constants";
import { CACHE_ARRAY } from "@/core3/module/bind-math/cache-names";
import type { ElementType } from "./element-type";
import { INT32, type Range, UINT32, rangeOf, within } from "./int-range";
import type { PlanContext } from "./plan-context";
import { NUM, type RefShape, type Ty, UNKNOWN, int, known, ref } from "./ty";
import { typeExpr } from "./type-expression";
import { validIndex } from "./valid-index";

export function typeMember(c: PlanContext, node: MemberExpression): Ty {
	return node.computed ? typeIndex(c, node) : typeField(c, node);
}

function typeField(c: PlanContext, node: MemberExpression): Ty {
	if (node.property.type !== "Identifier") return UNKNOWN;
	const field = node.property.name;
	if (isMathName(c, node.object))
		return MATH_CONSTANTS.has(field) ? known(Math[field as keyof Math] as number) : UNKNOWN;
	const owner = typeExpr(c, node.object, "value");
	const path = isPath(c, node.object);
	const ty = fieldTy(c, owner, field, path);
	if (path && ty !== UNKNOWN) c.paths.add(node);
	return ty;
}

function fieldTy(c: PlanContext, owner: Ty, field: string, path: boolean): Ty {
	if (owner.k === "role") return roleField(c, owner.role, field);
	if (owner.k !== "ref") return UNKNOWN;
	const shape = owner.shape;
	if (shape.k !== "record") {
		if (field !== "length") return UNKNOWN;
		return path ? known(shape.length) : NUM;
	}
	const f = shape.fields[field];
	if (f === undefined) return UNKNOWN;
	return f.k === "ref" ? ref(f.shape, !path) : f;
}

function roleField(c: PlanContext, role: string, field: string): Ty {
	const root = c.root;
	if (root === null) return UNKNOWN;
	switch (role) {
		case "state":
			return root.state(field) ?? UNKNOWN;
		case "ins":
			return root.input(field);
		case "outs":
			return NUM;
		default:
			return root.config(field);
	}
}

function typeIndex(c: PlanContext, node: MemberExpression): Ty {
	if (isCacheArray(c, node.object)) {
		typeExpr(c, node.property, "value");
		return NUM;
	}
	const owner = typeExpr(c, node.object, "value");
	const index = typeExpr(c, node.property, "value");
	if (owner.k !== "ref" || owner.shape.k === "record") return UNKNOWN;
	const path = isPath(c, node.object);
	const constant = path && index.k === "static" && typeof index.v === "number";
	const valid = constant && validIndex(index.v as number, owner.shape.length);
	if (owner.shape.k === "records") return listElement(c, node, owner.shape, valid);
	if (constant && !valid) return known(undefined);
	if (valid) c.elements.add(node);
	return int(path ? elementRange(owner.shape, index) : null);
}

const ELEMENT_RANGES: Readonly<Partial<Record<ElementType, Range>>> = {
	i32: INT32,
	u32: UINT32,
	i16: { lo: -32768, hi: 32767 },
	u16: { lo: 0, hi: 65535 },
	i8: { lo: -128, hi: 127 },
	u8: { lo: 0, hi: 255 },
	u8c: { lo: 0, hi: 255 },
};

/** An integer array's element at an index proven in bounds (one out of bounds reads `undefined`). */
function elementRange(shape: RefShape & { k: "array" }, index: Ty): Range | null {
	const range = ELEMENT_RANGES[shape.type];
	return range !== undefined && within(rangeOf(index), 0, shape.length - 1) ? range : null;
}

function listElement(
	c: PlanContext,
	node: AnyNode,
	shape: RefShape & { k: "records" },
	valid: boolean,
): Ty {
	if (valid) c.paths.add(node);
	return ref(shape.element, !valid);
}

function isPath(c: PlanContext, node: AnyNode): boolean {
	return (node.type === "Identifier" || node.type === "MemberExpression") && c.paths.has(node);
}

function isMathName(c: PlanContext, node: AnyNode): boolean {
	return node.type === "Identifier" && c.ir.scopes.references.get(node)?.k === "math";
}

function isCacheArray(c: PlanContext, node: AnyNode): boolean {
	if (node.type !== "Identifier") return false;
	const r = c.ir.scopes.references.get(node);
	return r?.k === "global" && r.name === CACHE_ARRAY;
}
