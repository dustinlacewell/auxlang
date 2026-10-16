/**
 * The type of an expression in one specialisation of a function (a tick
 * for one instance, a helper for one set of argument types):
 *
 *   static   known while compiling, with its value (it folds)
 *   num      a number at run time
 *   bool     a boolean at run time
 *   ref      a typed array, a record or an array of records in state
 *   role     one of a tick's parameter records
 *   unknown  none of these: no backend can hold it
 *
 * A `placed` ref is reached through an array of records at a run-time
 * index: its address needs run-time code, so nothing under it folds.
 */

import type { Role } from "@/core3/module/front/rules/rule-context";
import type { ElementType } from "./element-type";

/** A value known while compiling: config strings, constants, typeof results. */
export type StaticValue = number | string | boolean | undefined | null;

export interface Folded {
	readonly v: StaticValue;
}

export interface RecordRef {
	readonly k: "record";
	readonly fields: Readonly<Record<string, Ty>>;
}

export type RefShape =
	| { readonly k: "array"; readonly type: ElementType; readonly length: number }
	| RecordRef
	| { readonly k: "records"; readonly length: number; readonly element: RecordRef };

export type Ty =
	| { readonly k: "static"; readonly v: StaticValue }
	| { readonly k: "num" }
	| { readonly k: "bool" }
	| { readonly k: "ref"; readonly shape: RefShape; readonly placed: boolean }
	| { readonly k: "role"; readonly role: Role }
	| { readonly k: "unknown" };

export const NUM: Ty = { k: "num" };
export const BOOL: Ty = { k: "bool" };
export const UNKNOWN: Ty = { k: "unknown" };

export const known = (v: StaticValue): Ty => ({ k: "static", v });
export const ref = (shape: RefShape, placed = false): Ty => ({ k: "ref", shape, placed });

/** What a value of this type is at run time: a number, a boolean, or nothing a backend holds. */
export function emittedClass(ty: Ty): "num" | "bool" | "unknown" {
	if (ty.k === "num" || ty.k === "bool") return ty.k;
	if (ty.k !== "static") return "unknown";
	if (typeof ty.v === "boolean") return "bool";
	return typeof ty.v === "string" ? "unknown" : "num";
}

/** The type of a run-time value of `ty`'s class. */
export function emittedTy(ty: Ty): Ty {
	const c = emittedClass(ty);
	return c === "num" ? NUM : c === "bool" ? BOOL : UNKNOWN;
}

/** A key equal for equal types, for memoising a specialisation. */
export function tyKey(ty: Ty): string {
	switch (ty.k) {
		case "static":
			return `s${staticKey(ty.v)}`;
		case "ref":
			return `r${ty.placed ? "p" : ""}${shapeKey(ty.shape)}`;
		case "role":
			return `R${ty.role}`;
		default:
			return ty.k;
	}
}

function staticKey(v: StaticValue): string {
	if (v === undefined) return "u";
	if (typeof v === "number") return Object.is(v, -0) ? "n-0" : `n${v}`;
	return JSON.stringify(v);
}

function shapeKey(shape: RefShape): string {
	if (shape.k === "array") return `a${shape.type}:${shape.length}`;
	if (shape.k === "records") return `l${shape.length}:${shapeKey(shape.element)}`;
	const fields = Object.entries(shape.fields).map(([name, ty]) => `${name}=${tyKey(ty)}`);
	return `{${fields.join(",")}}`;
}
