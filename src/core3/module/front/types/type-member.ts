/**
 * Field and index reads. A tick's parameter record gives each field the
 * type its root holds; state in memory gives each field the type of its
 * shape. Only a member reached by a path (plan-context.ts) folds: a typed
 * array's or list's length, an array element at a constant index that is
 * not valid (`undefined`). A list element at a run-time index is placed:
 * nothing under it folds. An integer array's element read by a path at an
 * index proven in bounds has the element type's range. A field no state
 * has (field-fault.ts) is an event the check refuses.
 */

import type { AnyNode, MemberExpression } from "acorn";
import { MATH_CONSTANTS } from "@/core3/math/math-constants";
import { CACHE_ARRAY } from "@/core3/module/bind-math/cache-names";
import type { ElementType } from "./element-type";
import type { FieldFault } from "./field-fault";
import { INT32, type Range, UINT32, rangeOf, within } from "./int-range";
import type { PlanContext } from "./plan-context";
import { NUM, type RecordRef, type RefShape, type Ty, UNKNOWN, int, known, ref } from "./ty";
import { typeExpr } from "./type-expression";
import { typeNumeric } from "./type-numeric";
import { validIndex } from "./valid-index";

/** `write`: the member is the target of an assignment or update. */
export function typeMember(c: PlanContext, node: MemberExpression, write = false): Ty {
	return node.computed ? typeIndex(c, node, write) : typeField(c, node, write);
}

function typeField(c: PlanContext, node: MemberExpression, write: boolean): Ty {
	if (node.property.type !== "Identifier") return UNKNOWN;
	const field = node.property.name;
	if (isMathName(c, node.object))
		return MATH_CONSTANTS.has(field) ? known(Math[field as keyof Math] as number) : UNKNOWN;
	const owner = typeExpr(c, node.object, "value");
	const fault = fieldFault(owner, field, write);
	if (fault !== null) c.events.push({ k: "field", node, fault });
	const path = isPath(c, node.object);
	const ty = fieldTy(c, owner, field, path);
	if (path && ty !== UNKNOWN) c.paths.add(node);
	return ty;
}

function fieldFault(owner: Ty, field: string, write: boolean): FieldFault | null {
	if (isRecord(owner)) return Object.hasOwn(owner.shape.fields, field) ? null : { k: "missing", field, write };
	const constant = owner.k === "static" && (typeof owner.v === "number" || typeof owner.v === "boolean");
	const scalar = owner.k === "num" || owner.k === "bool" || constant;
	return scalar ? { k: "scalar", field } : null;
}

function isRecord(ty: Ty): ty is Ty & { k: "ref"; shape: RecordRef } {
	return ty.k === "ref" && ty.shape.k === "record";
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
			return root.outGroup(field) ?? NUM;
		default:
			return root.config(field);
	}
}

function typeIndex(c: PlanContext, node: MemberExpression, write: boolean): Ty {
	if (isCacheArray(c, node.object)) {
		typeNumeric(c, node.property, "value");
		return NUM;
	}
	const owner = typeExpr(c, node.object, "value");
	const index = typeNumeric(c, node.property, "value");
	if (isRecord(owner)) c.events.push({ k: "field", node, fault: { k: "indexed" } });
	if (owner.k !== "ref" || owner.shape.k === "record") return UNKNOWN;
	if (write && owner.shape.k === "records" && !within(rangeOf(index), 0, owner.shape.length - 1))
		c.events.push({ k: "field", node, fault: { k: "grows" } });
	const path = isPath(c, node.object);
	const constant = path && index.k === "static";
	const valid = constant && typeof index.v === "number" && validIndex(index.v, owner.shape.length);
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
